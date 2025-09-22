part of 'store_pagination.dart';

StorePagination _$StorePaginationFromJson(Map<String, dynamic> json) =>
    StorePagination(
      limit: json['limit'] as int?,
      nextCursor: json['nextCursor'] as String?,
    );

Map<String, dynamic> _$StorePaginationToJson(StorePagination instance) =>
    <String, dynamic>{
      'limit': instance.limit,
      'nextCursor': instance.nextCursor,
    };
