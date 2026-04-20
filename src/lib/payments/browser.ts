const GATEWAY_REDIRECT_HTML_STORAGE_KEY = "vfs.smile-pay.redirect-html";
const DEFAULT_GATEWAY_HANDOFF_PATH = "/payments/3ds-handoff";

export function renderGatewayRedirectHtml(html: string, handoffPath = DEFAULT_GATEWAY_HANDOFF_PATH) {
  if (typeof window === "undefined") {
    throw new Error("3D Secure handoff can only run in the browser.");
  }

  window.sessionStorage.setItem(GATEWAY_REDIRECT_HTML_STORAGE_KEY, html);
  window.location.assign(handoffPath);
}

export function consumeGatewayRedirectHtml() {
  if (typeof window === "undefined") {
    return null;
  }

  const html = window.sessionStorage.getItem(GATEWAY_REDIRECT_HTML_STORAGE_KEY);
  if (!html) {
    return null;
  }

  window.sessionStorage.removeItem(GATEWAY_REDIRECT_HTML_STORAGE_KEY);
  return html;
}

type GatewayRedirectFormSpec = {
  action: string;
  method: "get" | "post";
  acceptCharset?: string;
  enctype?: string;
  fields: Array<{ name: string; value: string }>;
};

function extractGatewayRedirectForm(html: string): GatewayRedirectFormSpec | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const form = parsed.querySelector("form");
  if (!form) {
    return null;
  }

  const action = form.getAttribute("action");
  if (!action) {
    return null;
  }

  const fields = Array.from(form.elements)
    .flatMap(element => {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
        return [];
      }

      if (!element.name) {
        return [];
      }

      if (element instanceof HTMLInputElement) {
        const type = element.type.toLowerCase();
        if ((type === "checkbox" || type === "radio") && !element.checked) {
          return [];
        }
      }

      return [{ name: element.name, value: element.value }];
    });

  const method = (form.getAttribute("method") || "post").toLowerCase() === "get" ? "get" : "post";

  return {
    action,
    method,
    acceptCharset: form.getAttribute("accept-charset") || undefined,
    enctype: form.getAttribute("enctype") || undefined,
    fields,
  };
}

export function submitGatewayRedirectHtml(html: string) {
  if (typeof document === "undefined") {
    throw new Error("3D Secure handoff can only run in the browser.");
  }

  const formSpec = extractGatewayRedirectForm(html);
  if (!formSpec) {
    return false;
  }

  const form = document.createElement("form");
  form.method = formSpec.method;
  form.action = formSpec.action;
  form.target = "_self";
  form.style.display = "none";

  if (formSpec.acceptCharset) {
    form.acceptCharset = formSpec.acceptCharset;
  }

  if (formSpec.enctype) {
    form.enctype = formSpec.enctype;
  }

  for (const field of formSpec.fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = field.name;
    input.value = field.value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  return true;
}
