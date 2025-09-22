import 'package:json_annotation/json_annotation.dart';

part 'store_pagination.g.dart';

@JsonSerializable()
class StorePagination {
  const StorePagination({
    this.limit,
    this.nextCursor,
  });

  final int? limit;
  final String? nextCursor;

  factory StorePagination.fromJson(Map<String, dynamic> json) =>
      _$StorePaginationFromJson(json);

  Map<String, dynamic> toJson() => _$StorePaginationToJson(this);
}
