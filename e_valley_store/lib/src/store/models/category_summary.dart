import 'package:json_annotation/json_annotation.dart';

part 'category_summary.g.dart';

@JsonSerializable()
class CategorySummary {
  const CategorySummary({
    required this.name,
    required this.productCount,
    required this.onSpecialCount,
    required this.subcategories,
  });

  final String name;
  final int productCount;
  final int onSpecialCount;
  final List<String> subcategories;

  factory CategorySummary.fromJson(Map<String, dynamic> json) =>
      _$CategorySummaryFromJson(json);

  Map<String, dynamic> toJson() => _$CategorySummaryToJson(this);
}
