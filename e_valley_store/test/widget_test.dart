// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:e_valley_store/main.dart';

void main() {
  testWidgets('App displays home content and navigates to Producers',
      (WidgetTester tester) async {
    await tester.pumpWidget(const EValleyStoreApp());

    expect(find.text('Home'), findsWidgets);
    expect(
      find.textContaining('home hub will highlight featured stories'),
      findsOneWidget,
    );

    await tester.tap(find.byTooltip('Open navigation menu'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Producers').last);
    await tester.pumpAndSettle();

    expect(find.text('Producers'), findsWidgets);
    expect(
      find.textContaining('Resources and programs tailored for agricultural'),
      findsOneWidget,
    );
  });
}
