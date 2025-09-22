import 'package:json_annotation/json_annotation.dart';

enum StoreApiSource {
  @JsonValue('firestore')
  firestore,

  @JsonValue('static')
  staticCatalog,
}
