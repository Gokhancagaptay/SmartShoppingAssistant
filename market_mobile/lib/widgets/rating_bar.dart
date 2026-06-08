import 'package:flutter/material.dart';

class RatingBar extends StatelessWidget {
  final double rating;
  final int reviewCount;
  final double starSize;
  final bool showCount;

  const RatingBar({
    super.key,
    required this.rating,
    this.reviewCount = 0,
    this.starSize = 12,
    this.showCount = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (rating <= 0 && reviewCount == 0) return const SizedBox.shrink();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ...List.generate(5, (i) {
          final filled = i < rating.floor();
          final half = !filled && i < rating;
          return Icon(
            filled
                ? Icons.star_rounded
                : half
                    ? Icons.star_half_rounded
                    : Icons.star_outline_rounded,
            size: starSize,
            color: const Color(0xFFF59E0B),
          );
        }),
        if (showCount && reviewCount > 0) ...[
          const SizedBox(width: 3),
          Text(
            '($reviewCount)',
            style: TextStyle(
              fontSize: starSize - 2,
              color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500],
            ),
          ),
        ],
      ],
    );
  }
}
