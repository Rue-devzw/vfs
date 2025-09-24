import '../../store/cart/cart_controller.dart';


class OrderPayload {
  OrderPayload({
    required this.isDiasporaGift,
    this.recipientName,
    this.recipientPhone,
    required this.deliveryMethod,
    this.customerName,
    this.customerPhone,
    this.customerAddress,
    required this.paymentMethod,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
    required this.totalQuantity,
  });

  final bool isDiasporaGift;
  final String? recipientName;
  final String? recipientPhone;
  final String deliveryMethod;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String paymentMethod;
  final List<CartItem> items;
  final double subtotal;
  final double deliveryFee;
  final double total;
  final int totalQuantity;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'isDiasporaGift': isDiasporaGift,
      'recipientName': recipientName,
      'recipientPhone': recipientPhone,
      'deliveryMethod': deliveryMethod,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'customerAddress': customerAddress,
      'paymentMethod': paymentMethod,
      'subtotal': subtotal,
      'deliveryFee': deliveryFee,
      'total': total,
      'totalQuantity': totalQuantity,
      'items': items.map((CartItem item) => item.toJson()).toList(growable: false),
    };
  }
}
