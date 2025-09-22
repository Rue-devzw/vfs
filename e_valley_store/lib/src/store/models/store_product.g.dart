part of 'store_product.dart';

StoreProduct _$StoreProductFromJson(Map<String, dynamic> json) => StoreProduct(
      id: json['id'] as String,
      name: json['name'] as String,
      price: _doubleFromJson(json['price'] as num),
      oldPrice: _nullableDoubleFromJson(json['oldPrice'] as num?),
      unit: json['unit'] as String,
      category: json['category'] as String,
      subcategory: json['subcategory'] as String?,
      image: json['image'] as String,
      onSpecial: json['onSpecial'] as bool,
      createdAt: _dateTimeFromIsoString(json['createdAt'] as String?),
      updatedAt: _dateTimeFromIsoString(json['updatedAt'] as String?),
    );

Map<String, dynamic> _$StoreProductToJson(StoreProduct instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'price': _doubleToJson(instance.price),
      'oldPrice': _nullableDoubleToJson(instance.oldPrice),
      'unit': instance.unit,
      'category': instance.category,
      'subcategory': instance.subcategory,
      'image': instance.image,
      'onSpecial': instance.onSpecial,
      'createdAt': _dateTimeToIsoString(instance.createdAt),
      'updatedAt': _dateTimeToIsoString(instance.updatedAt),
    };
