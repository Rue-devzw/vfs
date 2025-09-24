import 'package:json_annotation/json_annotation.dart';

import 'category_summary.dart';
import 'store_api_source.dart';
import 'store_pagination.dart';
import 'store_product.dart';



part 'store_api_responses.g.dart';

@JsonSerializable()
class StoreProductsResponse {
  const StoreProductsResponse({
    required this.data,
    this.pagination,
    required this.source,
  });

  final List<StoreProduct> data;
  final StorePagination? pagination;
  final StoreApiSource source;

  factory StoreProductsResponse.fromJson(Map<String, dynamic> json) =>
      _$StoreProductsResponseFromJson(json);

  Map<String, dynamic> toJson() => _$StoreProductsResponseToJson(this);
}

@JsonSerializable()
class StoreProductResponse {
  const StoreProductResponse({
    required this.data,
    required this.source,
  });

  final StoreProduct data;
  final StoreApiSource source;

  factory StoreProductResponse.fromJson(Map<String, dynamic> json) =>
      _$StoreProductResponseFromJson(json);

  Map<String, dynamic> toJson() => _$StoreProductResponseToJson(this);
}

@JsonSerializable()
class CategorySummariesResponse {
  const CategorySummariesResponse({
    required this.data,
    required this.source,
  });

  final List<CategorySummary> data;
  final StoreApiSource source;

  factory CategorySummariesResponse.fromJson(Map<String, dynamic> json) =>
      _$CategorySummariesResponseFromJson(json);

  Map<String, dynamic> toJson() =>
      _$CategorySummariesResponseToJson(this);
}
