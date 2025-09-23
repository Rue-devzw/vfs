import 'package:flutter/widgets.dart';
import 'package:webview_flutter_platform_interface/webview_flutter_platform_interface.dart';

class FakeWebViewPlatform extends WebViewPlatform {
  FakeWebViewPlatform();

  FakePlatformWebViewController? lastController;

  @override
  PlatformWebViewController createPlatformWebViewController(
    PlatformWebViewControllerCreationParams params,
  ) {
    final controller = FakePlatformWebViewController(params);
    lastController = controller;
    return controller;
  }

  @override
  PlatformNavigationDelegate createPlatformNavigationDelegate(
    PlatformNavigationDelegateCreationParams params,
  ) {
    return FakePlatformNavigationDelegate(params);
  }

  @override
  PlatformWebViewWidget createPlatformWebViewWidget(
    PlatformWebViewWidgetCreationParams params,
  ) {
    return FakePlatformWebViewWidget(params);
  }
}

class FakePlatformWebViewController extends PlatformWebViewController {
  FakePlatformWebViewController(super.params)
      : super.implementation(params);

  Uri? lastLoadedUri;
  JavaScriptMode? javaScriptMode;
  Color? backgroundColor;
  FakePlatformNavigationDelegate? navigationDelegate;
  bool canGoBackValue = false;
  bool goBackCalled = false;
  bool reloadCalled = false;

  @override
  Future<void> loadRequest(LoadRequestParams params) async {
    lastLoadedUri = params.uri;
  }

  @override
  Future<void> setJavaScriptMode(JavaScriptMode javaScriptMode) async {
    this.javaScriptMode = javaScriptMode;
  }

  @override
  Future<void> setBackgroundColor(Color color) async {
    backgroundColor = color;
  }

  @override
  Future<void> setPlatformNavigationDelegate(
    PlatformNavigationDelegate handler,
  ) async {
    navigationDelegate = handler as FakePlatformNavigationDelegate;
  }

  @override
  Future<bool> canGoBack() async => canGoBackValue;

  @override
  Future<void> goBack() async {
    goBackCalled = true;
  }

  @override
  Future<void> reload() async {
    reloadCalled = true;
  }
}

class FakePlatformNavigationDelegate extends PlatformNavigationDelegate {
  FakePlatformNavigationDelegate(super.params)
      : super.implementation(params);

  PageEventCallback? onPageStarted;
  PageEventCallback? onPageFinished;
  ProgressCallback? onProgress;

  @override
  Future<void> setOnPageStarted(PageEventCallback onPageStarted) async {
    this.onPageStarted = onPageStarted;
  }

  @override
  Future<void> setOnPageFinished(PageEventCallback onPageFinished) async {
    this.onPageFinished = onPageFinished;
  }

  @override
  Future<void> setOnProgress(ProgressCallback onProgress) async {
    this.onProgress = onProgress;
  }
}

class FakePlatformWebViewWidget extends PlatformWebViewWidget {
  FakePlatformWebViewWidget(super.params)
      : super.implementation(params);

  @override
  Widget build(BuildContext context) {
    return const SizedBox(key: Key('fake-webview'));
  }
}
