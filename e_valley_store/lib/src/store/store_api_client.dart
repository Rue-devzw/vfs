import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models/models.dart';
import 'store_api_config.dart';
import 'store_api_exception.dart';

class StoreApiClient {
  StoreApiClient({
    http.Client? httpClient,
    StoreApiConfig? config,
  })  : _httpClient = httpClient ?? http.Client(),
        _config = config ?? const StoreApiConfig();

  final http.Client _httpClient;
  final StoreApiConfig _config;

  static const _defaultHeaders = <String, String>{
    'Accept': 'application/json',
  };

  Uri _resolve(String path, [Map<String, String?>? queryParameters]) {
    final filtered = <String, String>{};
    if (queryParameters != null) {
      for (final entry in queryParameters.entries) {
        final value = entry.value;
        if (value != null && value.isNotEmpty) {
          filtered[entry.key] = value;
        }
      }
    }

    final base = _config.baseUri;
    final resolved = base.resolve(path);
    return resolved.replace(queryParameters: filtered.isEmpty ? null : filtered);
  }

  Future<StoreProductsResponse> fetchProducts({
    String? category,
    String? subcategory,
    bool? onSpecial,
    int? limit,
    String? cursor,
  }) async {
    final uri = _resolve('/api/store/products', {
      'category': category,
      'subcategory': subcategory,
      'onSpecial': onSpecial?.toString(),
      'limit': limit?.toString(),
      'cursor': cursor,
    });

    final response = await _httpClient.get(uri, headers: _defaultHeaders);
    return _decodeResponse(
      response,
      (json) => StoreProductsResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<StoreProductResponse> fetchProductById(String id) async {
    final uri = _resolve('/api/store/products/$id');
    final response = await _httpClient.get(uri, headers: _defaultHeaders);
    return _decodeResponse(
      response,
      (json) => StoreProductResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<CategorySummariesResponse> fetchCategories() async {
    final uri = _resolve('/api/store/categories');
    final response = await _httpClient.get(uri, headers: _defaultHeaders);
    return _decodeResponse(
      response,
      (json) =>
          CategorySummariesResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  T _decodeResponse<T>(http.Response response, T Function(Object json) parser) {
    if (response.statusCode != 200) {
      throw StoreApiException(
        'Request failed with status: ${response.statusCode}. Body: ${response.body}',
        statusCode: response.statusCode,
      );
    }

    final payload = json.decode(response.body);
    return parser(payload);
  }

  void close() {
    _httpClient.close();
  }
}
