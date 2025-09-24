import 'package:json_annotation/json_annotation.dart';


part 'store_product.g.dart';

DateTime? _dateTimeFromIsoString(String? value) {
  if (value == null || value.isEmpty) {
    return null;
  }
  return DateTime.tryParse(value);
}

String? _dateTimeToIsoString(DateTime? dateTime) => dateTime?.toIso8601String();

double _doubleFromJson(num value) => value.toDouble();

double? _nullableDoubleFromJson(num? value) => value?.toDouble();

num _doubleToJson(double value) => value;

num? _nullableDoubleToJson(double? value) => value;

@JsonSerializable()
class StoreProduct {
  const StoreProduct({
    required this.id,
    required this.name,
    required this.price,
    this.oldPrice,
    required this.unit,
    required this.category,
    this.subcategory,
    required this.image,
    required this.onSpecial,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;

  @JsonKey(fromJson: _doubleFromJson, toJson: _doubleToJson)
  final double price;

  @JsonKey(fromJson: _nullableDoubleFromJson, toJson: _nullableDoubleToJson)
  final double? oldPrice;

  final String unit;
  final String category;
  final String? subcategory;
  final String image;
  final bool onSpecial;

  @JsonKey(fromJson: _dateTimeFromIsoString, toJson: _dateTimeToIsoString)
  final DateTime? createdAt;

  @JsonKey(fromJson: _dateTimeFromIsoString, toJson: _dateTimeToIsoString)
  final DateTime? updatedAt;

  factory StoreProduct.fromJson(Map<String, dynamic> json) =>
      _$StoreProductFromJson(json);

  Map<String, dynamic> toJson() => _$StoreProductToJson(this);
}
