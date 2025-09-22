import 'package:flutter/foundation.dart';

class StoreApiConfig {
  const StoreApiConfig({
    this.overrideBaseUrl,
    this.localBaseUrl = 'http://localhost:9002',
    this.productionBaseUrl = 'https://valleyfarmsecrets.com',
  });

  final String? overrideBaseUrl;
  final String localBaseUrl;
  final String productionBaseUrl;

  static const String _environmentBaseUrl =
      String.fromEnvironment('STORE_API_BASE_URL');

  String get baseUrl {
    if (overrideBaseUrl != null && overrideBaseUrl!.isNotEmpty) {
      return overrideBaseUrl!;
    }

    if (_environmentBaseUrl.isNotEmpty) {
      return _environmentBaseUrl;
    }

    return kReleaseMode ? productionBaseUrl : localBaseUrl;
  }

  Uri get baseUri => Uri.parse(baseUrl);
}
