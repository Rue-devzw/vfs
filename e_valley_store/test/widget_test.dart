// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:e_valley_store/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'helpers/fake_webview_platform.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeWebViewPlatform fakePlatform;

  setUp(() {
    fakePlatform = FakeWebViewPlatform();
    WebViewPlatform.instance = fakePlatform;
  });

  testWidgets('renders store shell UI and loads the storefront URL',
      (WidgetTester tester) async {
    await tester.pumpWidget(const EValleyStoreApp());
    await tester.pump();

    expect(find.text('E-Valley Store'), findsOneWidget);
    expect(find.byIcon(Icons.refresh), findsOneWidget);
    expect(find.byKey(const Key('fake-webview')), findsOneWidget);

    final controller = fakePlatform.lastController;
    expect(controller, isNotNull);
    expect(
      controller!.lastLoadedUri,
      Uri.parse('https://valleyfarmsecrets.com/store'),
    );

    final progressFinder = find.byType(LinearProgressIndicator);
    expect(progressFinder, findsOneWidget);
    final initialIndicator =
        tester.widget<LinearProgressIndicator>(progressFinder);
    expect(initialIndicator.value, isNull);

    controller.navigationDelegate?.onProgress?.call(45);
    await tester.pump();
    final midIndicator =
        tester.widget<LinearProgressIndicator>(progressFinder);
    expect(midIndicator.value, closeTo(0.45, 1e-2));

    controller.navigationDelegate?.onPageFinished?.call('done');
    await tester.pump();
    expect(progressFinder, findsNothing);

    await tester.tap(find.byIcon(Icons.refresh));
    await tester.pump();
    expect(controller.reloadCalled, isTrue);
  });

  testWidgets('back navigation uses the webview history when available',
      (WidgetTester tester) async {
    await tester.pumpWidget(const EValleyStoreApp());
    await tester.pump();

    final controller = fakePlatform.lastController!;
    controller.canGoBackValue = true;

    final willPopScope = tester.widget<WillPopScope>(find.byType(WillPopScope));
    final shouldPop = await willPopScope.onWillPop!.call();

    expect(shouldPop, isFalse);
    expect(controller.goBackCalled, isTrue);
  });
}
