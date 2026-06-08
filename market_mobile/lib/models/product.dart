class Product {
  final String id;
  final String name;
  final double price;
  final int stock;
  final String imageUrl;
  final double averageRating;
  final int reviewCount;

  Product({
    required this.id,
    required this.name,
    required this.price,
    required this.stock,
    required this.imageUrl,
    this.averageRating = 0.0,
    this.reviewCount = 0,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['_id'] ?? json['id'] ?? json['name'],
        name: json['name'],
        price: (json['price'] as num).toDouble(),
        stock: json['stock'],
        imageUrl: json['image_url'] ?? '',
        averageRating: (json['average_rating'] as num?)?.toDouble() ?? 0.0,
        reviewCount: (json['review_count'] as num?)?.toInt() ?? 0,
      );
}
