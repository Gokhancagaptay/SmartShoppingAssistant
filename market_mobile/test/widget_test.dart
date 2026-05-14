import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:market_mobile/main.dart' show responsiveWrapper;

void main() {
  testWidgets('responsiveWrapper mobilde çocuğu doğrudan gösterir', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => responsiveWrapper(
            context: context,
            child: const Text('icerik'),
          ),
        ),
      ),
    );
    expect(find.text('icerik'), findsOneWidget);
  });
}
