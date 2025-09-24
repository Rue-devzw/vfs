import 'dart:async';

import 'models/models.dart';
import 'store_api_client.dart';



class StoreRepository {
  StoreRepository(
    this._apiClient, {
    this.maxRetries = 3,
    this.retryDelay = const Duration(seconds: 1),
  });

  final StoreApiClient _apiClient;
  final int maxRetries;
  final Duration retryDelay;

  final Map<String, StoreProduct> _productCache = {};
  final Map<_ProductQueryKey, _CachedStreamController<StoreProductsResponse>>
      _productStreams = {};
  final Map<String, _CachedStreamController<StoreProduct?>> _productControllers =
      {};
  final _CachedStreamController<CategorySummariesResponse>
      _categoryController = _CachedStreamController<CategorySummariesResponse>();

  Stream<StoreProductsResponse> watchProducts({
    String? category,
    String? subcategory,
    bool? onSpecial,
    int? limit,
    String? cursor,
  }) {
    final key = _ProductQueryKey(
      category: category,
      subcategory: subcategory,
      onSpecial: onSpecial,
      limit: limit,
      cursor: cursor,
    );
    final controller = _productStreams.putIfAbsent(
      key,
      () => _CachedStreamController<StoreProductsResponse>(),
    );

    if (controller.latest == null) {
      unawaited(
        refreshProducts(
          category: category,
          subcategory: subcategory,
          onSpecial: onSpecial,
          limit: limit,
          cursor: cursor,
        ),
      );
    }

    return controller.stream;
  }

  Future<StoreProductsResponse> refreshProducts({
    String? category,
    String? subcategory,
    bool? onSpecial,
    int? limit,
    String? cursor,
  }) async {
    final key = _ProductQueryKey(
      category: category,
      subcategory: subcategory,
      onSpecial: onSpecial,
      limit: limit,
      cursor: cursor,
    );
    final controller = _productStreams.putIfAbsent(
      key,
      () => _CachedStreamController<StoreProductsResponse>(),
    );

    try {
      final response = await _retry(
        () => _apiClient.fetchProducts(
          category: category,
          subcategory: subcategory,
          onSpecial: onSpecial,
          limit: limit,
          cursor: cursor,
        ),
      );

      for (final product in response.data) {
        _productCache[product.id] = product;
        _productControllers[product.id]?.add(product);
      }

      controller.add(response);
      return response;
    } catch (error, stackTrace) {
      controller.addError(error, stackTrace);
      rethrow;
    }
  }

  Stream<StoreProduct?> watchProduct(String id) {
    final controller = _productControllers.putIfAbsent(
      id,
      () => _CachedStreamController<StoreProduct?>(),
    );

    if (controller.latest == null && _productCache.containsKey(id)) {
      controller.add(_productCache[id]);
    }

    if (controller.latest == null) {
      unawaited(refreshProduct(id));
    }

    return controller.stream;
  }

  Future<StoreProductResponse> refreshProduct(String id) async {
    final controller = _productControllers.putIfAbsent(
      id,
      () => _CachedStreamController<StoreProduct?>(),
    );

    try {
      final response = await _retry(() => _apiClient.fetchProductById(id));
      final product = response.data;
      _productCache[id] = product;
      controller.add(product);
      return response;
    } catch (error, stackTrace) {
      controller.addError(error, stackTrace);
      rethrow;
    }
  }

  Stream<CategorySummariesResponse> watchCategories() {
    if (_categoryController.latest == null) {
      unawaited(refreshCategories());
    }

    return _categoryController.stream;
  }

  Future<CategorySummariesResponse> refreshCategories() async {
    try {
      final response = await _retry(_apiClient.fetchCategories);
      _categoryController.add(response);
      return response;
    } catch (error, stackTrace) {
      _categoryController.addError(error, stackTrace);
      rethrow;
    }
  }

  Future<T> _retry<T>(Future<T> Function() action) async {
    var attempt = 0;
    while (true) {
      try {
        return await action();
      } catch (error) {
        attempt += 1;
        if (attempt > maxRetries) {
          rethrow;
        }
        await Future<void>.delayed(retryDelay * attempt);
      }
    }
  }

  Future<void> dispose() async {
    for (final controller in _productStreams.values) {
      await controller.close();
    }
    for (final controller in _productControllers.values) {
      await controller.close();
    }
    await _categoryController.close();
    _apiClient.close();
  }
}

class _ProductQueryKey {
  const _ProductQueryKey({
    this.category,
    this.subcategory,
    this.onSpecial,
    this.limit,
    this.cursor,
  });

  final String? category;
  final String? subcategory;
  final bool? onSpecial;
  final int? limit;
  final String? cursor;

  @override
  bool operator ==(Object other) {
    return other is _ProductQueryKey &&
        other.category == category &&
        other.subcategory == subcategory &&
        other.onSpecial == onSpecial &&
        other.limit == limit &&
        other.cursor == cursor;
  }

  @override
  int get hashCode => Object.hash(
        category,
        subcategory,
        onSpecial,
        limit,
        cursor,
      );
}

class _CachedStreamController<T> {
  _CachedStreamController()
      : _controller = StreamController<T>.broadcast();

  final StreamController<T> _controller;
  T? latest;

  Stream<T> get stream => Stream.multi((multiController) {
        final subscription = _controller.stream.listen(
          multiController.add,
          onError: multiController.addError,
          onDone: multiController.close,
        );
        if (latest != null) {
          multiController.add(latest as T);
        }
        multiController.onCancel = () async {
          await subscription.cancel();
        };
      });

  void add(T value) {
    latest = value;
    _controller.add(value);
  }

  void addError(Object error, [StackTrace? stackTrace]) {
    _controller.addError(error, stackTrace);
  }

  Future<void> close() async {
    await _controller.close();
  }
}
