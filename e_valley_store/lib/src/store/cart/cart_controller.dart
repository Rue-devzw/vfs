import 'dart:collection';

import 'package:flutter/foundation.dart';

import '../models/store_product.dart';



class CartItem {
  const CartItem({
    required this.product,
    required this.quantity,
  });

  final StoreProduct product;
  final int quantity;

  double get total => product.price * quantity;

  CartItem copyWith({
    StoreProduct? product,
    int? quantity,
  }) {
    return CartItem(
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
    );
  }

  Map<String, dynamic> toJson() {
    final productJson = product.toJson();
    return <String, dynamic>{
      ...productJson,
      'quantity': quantity,
      'lineTotal': total,
    };
  }
}

class CartController extends ChangeNotifier {
  final List<CartItem> _items = <CartItem>[];

  UnmodifiableListView<CartItem> get items => UnmodifiableListView<CartItem>(_items);

  bool get hasItems => _items.isNotEmpty;

  int get totalQuantity =>
      _items.fold<int>(0, (int previousValue, CartItem element) => previousValue + element.quantity);

  double get subtotal =>
      _items.fold<double>(0, (double previousValue, CartItem element) => previousValue + element.total);

  void addProduct(StoreProduct product) {
    final index = _items.indexWhere((CartItem item) => item.product.id == product.id);
    if (index != -1) {
      final existing = _items[index];
      _items[index] = existing.copyWith(quantity: existing.quantity + 1);
    } else {
      _items.add(CartItem(product: product, quantity: 1));
    }
    notifyListeners();
  }

  void removeProduct(String productId) {
    _items.removeWhere((CartItem item) => item.product.id == productId);
    notifyListeners();
  }

  void updateQuantity(String productId, int quantity) {
    final index = _items.indexWhere((CartItem item) => item.product.id == productId);
    if (index == -1) {
      return;
    }

    if (quantity <= 0) {
      _items.removeAt(index);
    } else {
      final existing = _items[index];
      _items[index] = existing.copyWith(quantity: quantity);
    }
    notifyListeners();
  }

  void clear() {
    if (_items.isEmpty) {
      return;
    }
    _items.clear();
    notifyListeners();
  }
}
