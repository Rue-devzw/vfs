import { XMLParser } from "fast-xml-parser";
import { readFile } from "node:fs/promises";
import https from "node:https";
import { env } from "@/lib/env";

export class EgressGatewayError extends Error {
  readonly status: number;
  readonly responseBody?: string;

  constructor(status: number, message: string, responseBody?: string) {
    super(message);
    this.name = "EgressGatewayError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function isEgressServiceUnavailable(error: EgressGatewayError) {
  return error.status >= 500;
}

export function getEgressServiceUnavailableMessage(context: string) {
  return `${context} is temporarily unavailable because the provider gateway is not responding. Please try again shortly.`;
}

export type EgressValidateResponse = {
  successful: boolean;
  billerId?: string;
  customerAccount?: string;
  responseDetails?: string;
};

export type EgressPaymentPayload = {
  gatewayReference: string;
  billerId: string;
  paymentReference: string;
  customerAccount: string;
  amount: number;
  customerPaymentDetails1?: string;
  customerPaymentDetails2?: string;
  customerPaymentDetails3?: string;
  customerPaymentDetails4?: string;
  customerPaymentDetails5?: string;
  customerMobile?: string;
  customerPrimaryAccountNumber?: string;
  paymentDate: string;
  status?: string;
  narrative?: string;
  currency: string;
  customerName: string;
  paymentMethod: string;
  paymentType: string;
};

export type EgressPostPaymentResponse = {
  successful: boolean;
  receiptNumber?: string;
  receiptDetails?: string;
  payment?: Record<string, unknown>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

function getEgressConfig() {
  const apiUrl = env.ZB_EGRESS_API_URL;
  const source = env.ZB_EGRESS_SOURCE;
  if (!apiUrl) {
    throw new Error("ZB_EGRESS_API_URL is not configured.");
  }
  if (!source) {
    throw new Error("ZB_EGRESS_SOURCE is not configured.");
  }
  return {
    apiUrl,
    source,
    clientCertPath: env.ZB_EGRESS_CLIENT_CERT_PATH,
    clientKeyPath: env.ZB_EGRESS_CLIENT_KEY_PATH,
    caCertPath: env.ZB_EGRESS_CA_CERT_PATH,
    clientCert: env.ZB_EGRESS_CLIENT_CERT,
    clientKey: env.ZB_EGRESS_CLIENT_KEY,
    caCert: env.ZB_EGRESS_CA_CERT,
  };
}

async function loadCertData(path?: string, raw?: string): Promise<string | undefined> {
  if (raw && raw.includes("-----BEGIN")) {
    return raw;
  }
  if (path) {
    return readFile(path, "utf8");
  }
  return undefined;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlNode(name: string, value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return `<${name}></${name}>`;
  }
  return `<${name}>${escapeXml(String(value))}</${name}>`;
}

function buildEnvelope(body: string) {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.billpayment.zb.co.zw/"><soapenv:Body>${body}</soapenv:Body></soapenv:Envelope>`;
}

function parseSoapReturn<T extends Record<string, unknown>>(xml: string, responseTag: string) {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const envelope = parsed.Envelope as Record<string, unknown> | undefined;
  const body = envelope?.Body as Record<string, unknown> | undefined;
  const response = body?.[responseTag] as Record<string, unknown> | undefined;
  return (response?.return as T | undefined) ?? null;
}

async function postSoap(body: string) {
  const { apiUrl, clientCertPath, clientKeyPath, caCertPath, clientCert, clientKey, caCert } = getEgressConfig();

  if ((clientCertPath && clientKeyPath) || (clientCert && clientKey)) {
    return postSoapWithMutualTls(apiUrl, body, {
      clientCertPath,
      clientKeyPath,
      caCertPath,
      clientCert,
      clientKey,
      caCert,
    });
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '""',
    },
    body,
  });

  return handleSoapResponse(response.status, await response.text());
}

async function postSoapWithMutualTls(
  apiUrl: string,
  body: string,
  certConfig: {
    clientCertPath?: string;
    clientKeyPath?: string;
    caCertPath?: string;
    clientCert?: string;
    clientKey?: string;
    caCert?: string;
  },
) {
  const url = new URL(apiUrl);
  const [cert, key, ca] = await Promise.all([
    loadCertData(certConfig.clientCertPath, certConfig.clientCert),
    loadCertData(certConfig.clientKeyPath, certConfig.clientKey),
    loadCertData(certConfig.caCertPath, certConfig.caCert),
  ]);

  if (!cert || !key) {
    throw new EgressGatewayError(
      500,
      "ZB Egress Mutual TLS is enabled but missing configuration. Please ensure ZB_EGRESS_CLIENT_CERT and ZB_EGRESS_CLIENT_KEY are set in environment variables."
    );
  }

  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "Content-Length": Buffer.byteLength(body, "utf8"),
          SOAPAction: '""',
        },
        cert,
        key,
        ca,
        rejectUnauthorized: true,
      },
      (responseStream) => {
        let responseBody = "";
        responseStream.setEncoding("utf8");
        responseStream.on("data", (chunk) => {
          responseBody += chunk;
        });
        responseStream.on("end", () => {
          resolve({
            status: responseStream.statusCode ?? 500,
            body: responseBody,
          });
        });
      },
    );

    request.on("error", (error) => {
      reject(new EgressGatewayError(502, `EGRESS TLS request failed: ${error.message}`));
    });

    request.write(body);
    request.end();
  });

  return handleSoapResponse(response.status, response.body);
}

function handleSoapResponse(status: number, text: string) {
  if (status < 200 || status >= 300) {
    throw new EgressGatewayError(status, `EGRESS request failed with status ${status}`, text);
  }

  if (!text.trim()) {
    throw new EgressGatewayError(status, "EGRESS returned an empty response body", text);
  }

  return text;
}

export async function egressValidateCustomerAccount(input: {
  billerId: string;
  customerAccount: string;
}) {
  const { source } = getEgressConfig();
  const envelope = buildEnvelope(
    `<ws:validateCustomerAccount>${xmlNode("source", source)}${xmlNode("billerId", input.billerId)}${xmlNode("customerAccount", input.customerAccount)}</ws:validateCustomerAccount>`,
  );

  const xml = await postSoap(envelope);
  const result = parseSoapReturn<Record<string, unknown>>(xml, "validateCustomerAccountResponse");
  if (!result) {
    throw new EgressGatewayError(502, "EGRESS validation response could not be parsed", xml);
  }

  return {
    successful: String(result.successful).toLowerCase() === "true",
    billerId: typeof result.billerId === "string" ? result.billerId : undefined,
    customerAccount: typeof result.customerAccount === "string" ? result.customerAccount : undefined,
    responseDetails: typeof result.responseDetails === "string" ? result.responseDetails : undefined,
  } satisfies EgressValidateResponse;
}

export async function egressPostPayment(input: EgressPaymentPayload) {
  const { source } = getEgressConfig();
  const paymentXml = [
    xmlNode("gatewayReference", input.gatewayReference),
    xmlNode("billerId", input.billerId),
    xmlNode("paymentReference", input.paymentReference),
    xmlNode("source", source),
    xmlNode("customerAccount", input.customerAccount),
    xmlNode("amount", input.amount),
    xmlNode("customerPaymentDetails1", input.customerPaymentDetails1),
    xmlNode("customerPaymentDetails2", input.customerPaymentDetails2),
    xmlNode("customerPaymentDetails3", input.customerPaymentDetails3),
    xmlNode("customerPaymentDetails4", input.customerPaymentDetails4),
    xmlNode("customerPaymentDetails5", input.customerPaymentDetails5),
    xmlNode("customerMobile", input.customerMobile),
    xmlNode("customerPrimaryAccountNumber", input.customerPrimaryAccountNumber),
    xmlNode("paymentDate", input.paymentDate),
    xmlNode("status", input.status),
    xmlNode("narrative", input.narrative),
    xmlNode("currency", input.currency),
    xmlNode("customerName", input.customerName),
    xmlNode("paymentMethod", input.paymentMethod),
    xmlNode("paymentType", input.paymentType),
  ].join("");

  const envelope = buildEnvelope(`<ws:postPayment><payment>${paymentXml}</payment></ws:postPayment>`);
  const xml = await postSoap(envelope);
  const result = parseSoapReturn<Record<string, unknown>>(xml, "postPaymentResponse");
  if (!result) {
    throw new EgressGatewayError(502, "EGRESS payment response could not be parsed", xml);
  }

  return {
    successful: String(result.successful).toLowerCase() === "true",
    receiptNumber: typeof result.receiptNumber === "string" ? result.receiptNumber : undefined,
    receiptDetails: typeof result.receiptDetails === "string" ? result.receiptDetails : undefined,
    payment: typeof result.payment === "object" && result.payment !== null ? result.payment as Record<string, unknown> : undefined,
  } satisfies EgressPostPaymentResponse;
}
