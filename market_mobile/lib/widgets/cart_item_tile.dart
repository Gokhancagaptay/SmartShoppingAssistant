import 'package:flutter/material.dart';
import '../models/product.dart';

/// Sepet listesinde her bir ürün satırını gösteren yeniden kullanılabilir bileşen.
class CartItemTile extends StatelessWidget {
  final Product product;
  final int qty;
  final VoidCallback onInc;
  final VoidCallback onDec;
  final VoidCallback onRemove;

  const CartItemTile({
    Key? key,
    required this.product,
    required this.qty,
    required this.onInc,
    required this.onDec,
    required this.onRemove,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          product.imageUrl,
          width: 48,
          height: 48,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            width: 48,
            height: 48,
            color: colorScheme.surfaceVariant,
            child: const Icon(Icons.image_not_supported, size: 24),
          ),
        ),
      ),
      title: Text(
        product.name,
        style: const TextStyle(fontWeight: FontWeight.w600),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${(product.price * qty).toStringAsFixed(2)} ₺',
        style: TextStyle(color: colorScheme.primary, fontWeight: FontWeight.w500),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove_circle_outline, size: 20),
            onPressed: onDec,
            tooltip: 'Azalt',
          ),
          Text(
            qty.toString(),
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline, size: 20),
            onPressed: onInc,
            tooltip: 'Artır',
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
            onPressed: onRemove,
            tooltip: 'Kaldır',
          ),
        ],
      ),
    );
  }
}
