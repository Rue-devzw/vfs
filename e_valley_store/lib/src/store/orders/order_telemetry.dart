import 'package:flutter/foundation.dart';

import '../cart/cart_controller.dart';
import 'order_payload.dart';



class OrderTelemetry {
  const OrderTelemetry._();

  static void recordOrderAttempt(OrderPayload payload) {
    debugPrint('[Telemetry] Attempting order submission with '
        '${payload.totalQuantity} items totaling USD ${payload.total.toStringAsFixed(2)}.');
  }

  static void recordOrderResult(
    OrderPayload payload, {
    required bool success,
    Map<String, dynamic>? response,
  }) {
    debugPrint('[Telemetry] Order ${success ? 'succeeded' : 'failed'} '
        '(${payload.totalQuantity} items, total USD ${payload.total.toStringAsFixed(2)}). '
        'Response: ${response != null ? response.toString() : 'none'}');
  }

  static void recordOrderError(OrderPayload payload, Object error, StackTrace stackTrace) {
    debugPrint('[Telemetry] Order error for ${payload.totalQuantity} items: $error');
  }

  static Map<String, dynamic> serializeItems(List<CartItem> items) {
    return <String, dynamic>{
      'totalItems': items.length,
      'quantities': items
          .map((CartItem item) => <String, dynamic>{
                'id': item.product.id,
                'quantity': item.quantity,
              })
          .toList(growable: false),
    };
  }
}
