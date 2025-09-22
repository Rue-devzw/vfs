part of 'store_api_responses.dart';

StoreProductsResponse _$StoreProductsResponseFromJson(
        Map<String, dynamic> json) =>
    StoreProductsResponse(
      data: (json['data'] as List<dynamic>)
          .map((e) => StoreProduct.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: json['pagination'] == null
          ? null
          : StorePagination.fromJson(
              json['pagination'] as Map<String, dynamic>,
            ),
      source: _storeApiSourceFromJson(json['source']),
    );

Map<String, dynamic> _$StoreProductsResponseToJson(
        StoreProductsResponse instance) =>
    <String, dynamic>{
      'data': instance.data.map((e) => e.toJson()).toList(),
      'pagination': instance.pagination?.toJson(),
      'source': _storeApiSourceToJson(instance.source),
    };

StoreProductResponse _$StoreProductResponseFromJson(
        Map<String, dynamic> json) =>
    StoreProductResponse(
      data: StoreProduct.fromJson(json['data'] as Map<String, dynamic>),
      source: _storeApiSourceFromJson(json['source']),
    );

Map<String, dynamic> _$StoreProductResponseToJson(
        StoreProductResponse instance) =>
    <String, dynamic>{
      'data': instance.data.toJson(),
      'source': _storeApiSourceToJson(instance.source),
    };

CategorySummariesResponse _$CategorySummariesResponseFromJson(
        Map<String, dynamic> json) =>
    CategorySummariesResponse(
      data: (json['data'] as List<dynamic>)
          .map((e) => CategorySummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      source: _storeApiSourceFromJson(json['source']),
    );

Map<String, dynamic> _$CategorySummariesResponseToJson(
        CategorySummariesResponse instance) =>
    <String, dynamic>{
      'data': instance.data.map((e) => e.toJson()).toList(),
      'source': _storeApiSourceToJson(instance.source),
    };

StoreApiSource _storeApiSourceFromJson(Object? value) {
  if (value is String) {
    switch (value) {
      case 'firestore':
        return StoreApiSource.firestore;
      case 'static':
        return StoreApiSource.staticCatalog;
    }
  }
  throw ArgumentError('Unknown StoreApiSource value: \$value');
}

String _storeApiSourceToJson(StoreApiSource source) {
  switch (source) {
    case StoreApiSource.firestore:
      return 'firestore';
    case StoreApiSource.staticCatalog:
      return 'static';
  }
}
