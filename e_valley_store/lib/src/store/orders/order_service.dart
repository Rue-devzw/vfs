import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../store_api_config.dart';
import 'order_payload.dart';
import 'order_telemetry.dart';

class OrderSubmissionResult {
  const OrderSubmissionResult.success(this.message, {this.data}) : isSuccess = true;

  const OrderSubmissionResult.failure(this.message, {this.data}) : isSuccess = false;

  final bool isSuccess;
  final String message;
  final Map<String, dynamic>? data;
}

class OrderService {
  OrderService({
    http.Client? httpClient,
    StoreApiConfig? config,
  })  : _httpClient = httpClient ?? http.Client(),
        _config = config ?? const StoreApiConfig();

  final http.Client _httpClient;
  final StoreApiConfig _config;

  @visibleForTesting
  StoreApiConfig get config => _config;

  Future<OrderSubmissionResult> submitOrder(OrderPayload payload) async {
    final Uri uri = Uri.parse('${_config.baseUrl}/api/orders');
    OrderTelemetry.recordOrderAttempt(payload);

    try {
      final http.Response response = await _httpClient.post(
        uri,
        headers: const <String, String>{
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode(payload.toJson()),
      );

      final Map<String, dynamic>? body = _parseBody(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        OrderTelemetry.recordOrderResult(payload, success: true, response: body);
        final String message = body?['message'] as String? ?? 'Order submitted successfully';
        return OrderSubmissionResult.success(message, data: body);
      }

      final String errorMessage = body?['error'] as String? ??
          'We were unable to submit your order. Please try again later.';
      OrderTelemetry.recordOrderResult(payload, success: false, response: body);
      return OrderSubmissionResult.failure(errorMessage, data: body);
    } catch (error, stackTrace) {
      OrderTelemetry.recordOrderError(payload, error, stackTrace);
      return const OrderSubmissionResult.failure(
        'Something went wrong while submitting your order. Please check your connection and try again.',
      );
    }
  }

  Map<String, dynamic>? _parseBody(String body) {
    if (body.isEmpty) {
      return null;
    }
    try {
      final dynamic decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  void dispose() {
    _httpClient.close();
  }
}
