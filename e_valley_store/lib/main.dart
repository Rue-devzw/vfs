import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

const String _defaultStoreUrl = String.fromEnvironment(
  'STORE_WEB_URL',
  defaultValue: 'https://valleyfarmsecrets.com/store',
);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EValleyStoreApp());
}

class EValleyStoreApp extends StatelessWidget {
  const EValleyStoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'E-Valley Store',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF5A842A),
        brightness: Brightness.light,
      ),
      home: const StoreWebViewPage(storeUrl: _defaultStoreUrl),
    );
  }
}

class StoreWebViewPage extends StatefulWidget {
  const StoreWebViewPage({
    super.key,
    required this.storeUrl,
  });

  final String storeUrl;

  @override
  State<StoreWebViewPage> createState() => _StoreWebViewPageState();
}

class _StoreWebViewPageState extends State<StoreWebViewPage> {
  late final WebViewController _controller;
  int _loadingProgress = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            setState(() {
              _loadingProgress = 0;
            });
          },
          onProgress: (progress) {
            setState(() {
              var boundedProgress = progress;
              if (boundedProgress < 0) {
                boundedProgress = 0;
              } else if (boundedProgress > 100) {
                boundedProgress = 100;
              }
              _loadingProgress = boundedProgress;
            });
          },
          onPageFinished: (_) {
            setState(() {
              _loadingProgress = 100;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.storeUrl));
  }

  Future<bool> _handleWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _handleWillPop,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('E-Valley Store'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _controller.reload,
              tooltip: 'Reload',
            ),
          ],
        ),
        body: Stack(
          children: [
            SafeArea(
              child: WebViewWidget(controller: _controller),
            ),
            if (_loadingProgress < 100)
              LinearProgressIndicator(
                value: _loadingProgress == 0 ? null : _loadingProgress / 100,
              ),
          ],
        ),
      ),
    );
  }
}
