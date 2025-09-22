part of 'category_summary.dart';

CategorySummary _$CategorySummaryFromJson(Map<String, dynamic> json) =>
    CategorySummary(
      name: json['name'] as String,
      productCount: json['productCount'] as int,
      onSpecialCount: json['onSpecialCount'] as int,
      subcategories: (json['subcategories'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$CategorySummaryToJson(CategorySummary instance) =>
    <String, dynamic>{
      'name': instance.name,
      'productCount': instance.productCount,
      'onSpecialCount': instance.onSpecialCount,
      'subcategories': instance.subcategories,
    };
