class StoreApiException implements Exception {
  StoreApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'StoreApiException(statusCode: ' '\$statusCode, message: ' '\$message)';
}
