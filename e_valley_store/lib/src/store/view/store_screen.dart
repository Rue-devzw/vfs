import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';
import '../store_api_client.dart';
import '../store_repository.dart';

class StoreScreen extends StatefulWidget {
  const StoreScreen({super.key});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  late final StoreRepository _repository;
  late final Stream<StoreProductsResponse> _productsStream;
  late final Stream<StoreProductsResponse> _specialsStream;
  late final Stream<CategorySummariesResponse> _categoriesStream;

  final PageController _heroController = PageController();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  final GlobalKey _productSectionKey = GlobalKey();

  Timer? _heroTimer;
  int _currentHeroIndex = 0;

  bool _showSpecialsOnly = false;
  String? _selectedCategory;
  StoreSortOption _sortOption = StoreSortOption.nameAsc;
  String _searchTerm = '';

  @override
  void initState() {
    super.initState();
    _repository = StoreRepository(StoreApiClient());
    _productsStream = _repository.watchProducts();
    _specialsStream = _repository.watchProducts(onSpecial: true);
    _categoriesStream = _repository.watchCategories();

    _heroTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted) return;
      final nextPage = (_currentHeroIndex + 1) % _heroSlides.length;
      _heroController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    _heroController.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    unawaited(_repository.dispose());
    super.dispose();
  }

  void _handleHeroChanged(int index) {
    setState(() {
      _currentHeroIndex = index;
    });
  }

  void _scrollToProducts() {
    final context = _productSectionKey.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOut,
      );
    }
  }

  void _selectCategory(String? category) {
    setState(() {
      _selectedCategory = category;
      _showSpecialsOnly = false;
    });
    _scrollToProducts();
  }

  void _viewSpecials() {
    setState(() {
      _showSpecialsOnly = true;
    });
    _scrollToProducts();
  }

  void _updateSort(StoreSortOption option) {
    setState(() {
      _sortOption = option;
    });
  }

  void _updateSearch(String value) {
    setState(() {
      _searchTerm = value;
    });
  }

  bool get _hasActiveFilter =>
      _showSpecialsOnly || _selectedCategory != null || _searchTerm.isNotEmpty;

  List<StoreProduct> _applyFilters(List<StoreProduct> products) {
    var filtered = products;

    if (_showSpecialsOnly) {
      filtered = filtered.where((product) => product.onSpecial).toList();
    }

    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      filtered = filtered
          .where((product) => product.category == _selectedCategory)
          .toList();
    }

    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered
          .where((product) => product.name.toLowerCase().contains(term))
          .toList();
    }

    filtered.sort((a, b) {
      switch (_sortOption) {
        case StoreSortOption.nameAsc:
          return a.name.toLowerCase().compareTo(b.name.toLowerCase());
        case StoreSortOption.nameDesc:
          return b.name.toLowerCase().compareTo(a.name.toLowerCase());
        case StoreSortOption.priceAsc:
          return a.price.compareTo(b.price);
        case StoreSortOption.priceDesc:
          return b.price.compareTo(a.price);
      }
    });

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<StoreProductsResponse>(
      stream: _productsStream,
      builder: (context, productSnapshot) {
        if (productSnapshot.hasError) {
          return _StoreErrorState(
            message:
                'We were unable to load products. Please try again shortly.',
            onRetry: () => _repository.refreshProducts(),
          );
        }

        if (!productSnapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final products = productSnapshot.data!.data;

        return StreamBuilder<CategorySummariesResponse>(
          stream: _categoriesStream,
          builder: (context, categorySnapshot) {
            final categories = categorySnapshot.data?.data
                    .map((summary) => summary.name)
                    .toList(growable: false) ??
                (products.map((product) => product.category).toSet().toList()
                  ..sort());

            return Scrollbar(
              controller: _scrollController,
              child: SingleChildScrollView(
                controller: _scrollController,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _StoreHero(
                      controller: _heroController,
                      currentIndex: _currentHeroIndex,
                      onChanged: (index) {
                        _handleHeroChanged(index);
                      },
                      onSelectCategory: _selectCategory,
                      onViewSpecials: _viewSpecials,
                    ),
                    _QuickTilesSection(onViewSpecials: _viewSpecials),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 24,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _SpecialsCarousel(
                            stream: _specialsStream,
                            onViewSpecials: _viewSpecials,
                          ),
                          const SizedBox(height: 32),
                          _ProductExplorer(
                            key: _productSectionKey,
                            products: products,
                            categories: categories,
                            showSpecialsOnly: _showSpecialsOnly,
                            selectedCategory: _selectedCategory,
                            sortOption: _sortOption,
                            hasActiveFilter: _hasActiveFilter,
                            onSelectCategory: _selectCategory,
                            onToggleSpecials: (value) {
                              setState(() => _showSpecialsOnly = value);
                            },
                            onSortChanged: _updateSort,
                            searchController: _searchController,
                            onSearchChanged: _updateSearch,
                            filteredProducts: _applyFilters(products),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _StoreHero extends StatelessWidget {
  const _StoreHero({
    required this.controller,
    required this.currentIndex,
    required this.onChanged,
    required this.onSelectCategory,
    required this.onViewSpecials,
  });

  final PageController controller;
  final int currentIndex;
  final ValueChanged<int> onChanged;
  final ValueChanged<String?> onSelectCategory;
  final VoidCallback onViewSpecials;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      color: theme.colorScheme.primaryContainer.withOpacity(0.25),
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 320,
            child: PageView.builder(
              controller: controller,
              onPageChanged: onChanged,
              itemCount: _heroSlides.length,
              itemBuilder: (context, index) {
                final slide = _heroSlides[index];
                return Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(28),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          slide.imageUrl,
                          fit: BoxFit.cover,
                          color: Colors.black.withOpacity(0.25),
                          colorBlendMode: BlendMode.darken,
                          loadingBuilder: (context, child, event) {
                            if (event == null) return child;
                            return Container(
                              color: theme.colorScheme.surfaceVariant,
                              alignment: Alignment.center,
                              child: const CircularProgressIndicator(),
                            );
                          },
                          errorBuilder: (context, _, __) => Container(
                            color: theme.colorScheme.surfaceVariant,
                            alignment: Alignment.center,
                            child: Icon(
                              Icons.photo,
                              color: theme.colorScheme.onSurface
                                  .withOpacity(0.4),
                              size: 56,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(32),
                          alignment: Alignment.centerLeft,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 520),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.primary,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    slide.highlight,
                                    style: theme.textTheme.labelLarge?.copyWith(
                                      color: theme.colorScheme.onPrimary,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  slide.title,
                                  style: theme.textTheme.headlineMedium?.copyWith(
                                    color: theme.colorScheme.onPrimary,
                                    shadows: const [
                                      Shadow(
                                        offset: Offset(0, 2),
                                        blurRadius: 12,
                                        color: Colors.black54,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  slide.description,
                                  style: theme.textTheme.bodyLarge?.copyWith(
                                    color: theme.textTheme.bodyLarge?.color
                                            ?.withOpacity(0.92) ??
                                        theme.colorScheme.onPrimary
                                            .withOpacity(0.92),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                Wrap(
                                  spacing: 12,
                                  runSpacing: 12,
                                  children: [
                                    FilledButton(
                                      onPressed: () =>
                                          onSelectCategory(slide.category),
                                      child: Text(slide.cta),
                                    ),
                                    OutlinedButton(
                                      onPressed: onViewSpecials,
                                      child: const Text('See specials'),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Wrap(
              spacing: 8,
              children: List.generate(_heroSlides.length, (index) {
                final selected = index == currentIndex;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeInOut,
                  width: selected ? 20 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: selected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurface.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(999),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickTilesSection extends StatelessWidget {
  const _QuickTilesSection({required this.onViewSpecials});

  final VoidCallback onViewSpecials;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: SizedBox(
        height: 164,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: _quickTiles.length,
          separatorBuilder: (_, __) => const SizedBox(width: 16),
          itemBuilder: (context, index) {
            final tile = _quickTiles[index];
            return SizedBox(
              width: 280,
              child: Card(
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: tile.action == QuickTileAction.viewSpecials
                      ? onViewSpecials
                      : tile.action == QuickTileAction.phone
                          ? () => _launchUrl(tile.actionTarget)
                          : null,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              height: 40,
                              width: 40,
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                tile.icon,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Text(
                                tile.title,
                                style: theme.textTheme.titleMedium,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: Text(
                            tile.description,
                            style: theme.textTheme.bodyMedium,
                          ),
                        ),
                        if (tile.footer != null)
                          Text(
                            tile.footer!,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          )
                        else
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              onPressed: tile.action == QuickTileAction.viewSpecials
                                  ? onViewSpecials
                                  : tile.action == QuickTileAction.phone
                                      ? () => _launchUrl(tile.actionTarget)
                                      : null,
                              child: Text(tile.actionLabel ?? ''),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SpecialsCarousel extends StatelessWidget {
  const _SpecialsCarousel({
    required this.stream,
    required this.onViewSpecials,
  });

  final Stream<StoreProductsResponse> stream;
  final VoidCallback onViewSpecials;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Flash Deals',
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  'Catch the latest promotions before they sell out.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            TextButton(
              onPressed: onViewSpecials,
              child: const Text('Shop all specials'),
            ),
          ],
        ),
        const SizedBox(height: 20),
        StreamBuilder<StoreProductsResponse>(
          stream: stream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return _StoreErrorBanner(
                message:
                    'We could not load the latest specials right now. Please try again.',
                onRetry: onViewSpecials,
              );
            }

            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }

            final specials = snapshot.data!.data;
            if (specials.isEmpty) {
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: theme.colorScheme.outlineVariant),
                ),
                child: Text(
                  'New deals are loading — check back soon!',
                  style: theme.textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
              );
            }

            return SizedBox(
              height: 280,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: specials.length,
                separatorBuilder: (_, __) => const SizedBox(width: 16),
                itemBuilder: (context, index) {
                  final product = specials[index];
                  return SizedBox(
                    width: 240,
                    child: _StoreProductCard(product: product),
                  );
                },
              ),
            );
          },
        ),
      ],
    );
  }
}

class _ProductExplorer extends StatelessWidget {
  const _ProductExplorer({
    super.key,
    required this.products,
    required this.categories,
    required this.showSpecialsOnly,
    required this.selectedCategory,
    required this.sortOption,
    required this.hasActiveFilter,
    required this.onSelectCategory,
    required this.onToggleSpecials,
    required this.onSortChanged,
    required this.searchController,
    required this.onSearchChanged,
    required this.filteredProducts,
  });

  final List<StoreProduct> products;
  final List<String> categories;
  final bool showSpecialsOnly;
  final String? selectedCategory;
  final StoreSortOption sortOption;
  final bool hasActiveFilter;
  final ValueChanged<String?> onSelectCategory;
  final ValueChanged<bool> onToggleSpecials;
  final ValueChanged<StoreSortOption> onSortChanged;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final List<StoreProduct> filteredProducts;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 920;

        final filterControls = _FilterPanel(
          categories: categories,
          searchController: searchController,
          selectedCategory: selectedCategory,
          showSpecialsOnly: showSpecialsOnly,
          onSearchChanged: onSearchChanged,
          onCategorySelected: onSelectCategory,
          onToggleSpecials: onToggleSpecials,
        );

        final grid = _ProductGrid(
          products: filteredProducts,
          categories: categories,
          hasActiveFilter: hasActiveFilter,
          sortOption: sortOption,
          onSortChanged: onSortChanged,
        );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 300, child: filterControls),
              const SizedBox(width: 32),
              Expanded(child: grid),
            ],
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            filterControls,
            const SizedBox(height: 24),
            grid,
          ],
        );
      },
    );
  }
}

class _FilterPanel extends StatelessWidget {
  const _FilterPanel({
    required this.categories,
    required this.searchController,
    required this.selectedCategory,
    required this.showSpecialsOnly,
    required this.onSearchChanged,
    required this.onCategorySelected,
    required this.onToggleSpecials,
  });

  final List<String> categories;
  final TextEditingController searchController;
  final String? selectedCategory;
  final bool showSpecialsOnly;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String?> onCategorySelected;
  final ValueChanged<bool> onToggleSpecials;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filters',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: searchController,
              decoration: const InputDecoration(
                labelText: 'Search products',
                hintText: 'e.g. Apples, Steak…',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: onSearchChanged,
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: showSpecialsOnly,
              title: const Text('Show special offers only'),
              onChanged: onToggleSpecials,
            ),
            const Divider(height: 32),
            Text(
              'Category',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ChoiceChip(
                  label: const Text('All'),
                  selected: selectedCategory == null,
                  onSelected: (_) => onCategorySelected(null),
                ),
                ...categories.map(
                  (category) => ChoiceChip(
                    label: Text(category),
                    selected: selectedCategory == category,
                    onSelected: (_) => onCategorySelected(category),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductGrid extends StatelessWidget {
  const _ProductGrid({
    required this.products,
    required this.categories,
    required this.hasActiveFilter,
    required this.sortOption,
    required this.onSortChanged,
  });

  final List<StoreProduct> products;
  final List<String> categories;
  final bool hasActiveFilter;
  final StoreSortOption sortOption;
  final ValueChanged<StoreSortOption> onSortChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            DropdownButton<StoreSortOption>(
              value: sortOption,
              onChanged: (value) {
                if (value != null) {
                  onSortChanged(value);
                }
              },
              items: const [
                DropdownMenuItem(
                  value: StoreSortOption.nameAsc,
                  child: Text('Name (A-Z)'),
                ),
                DropdownMenuItem(
                  value: StoreSortOption.nameDesc,
                  child: Text('Name (Z-A)'),
                ),
                DropdownMenuItem(
                  value: StoreSortOption.priceAsc,
                  child: Text('Price (Low-High)'),
                ),
                DropdownMenuItem(
                  value: StoreSortOption.priceDesc,
                  child: Text('Price (High-Low)'),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (hasActiveFilter)
          _FilteredGrid(products: products)
        else
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final category in categories)
                _CategorySection(
                  title: category,
                  products: products
                      .where((product) => product.category == category)
                      .toList(),
                ),
            ],
          ),
      ],
    );
  }
}

class _FilteredGrid extends StatelessWidget {
  const _FilteredGrid({required this.products});

  final List<StoreProduct> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Text(
          'No products match your filters.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      );
    }

    return _ResponsiveGrid(products: products);
  }
}

class _CategorySection extends StatelessWidget {
  const _CategorySection({required this.title, required this.products});

  final String title;
  final List<StoreProduct> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          _ResponsiveGrid(products: products),
        ],
      ),
    );
  }
}

class _ResponsiveGrid extends StatelessWidget {
  const _ResponsiveGrid({required this.products});

  final List<StoreProduct> products;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        int crossAxisCount = 1;
        if (constraints.maxWidth >= 1100) {
          crossAxisCount = 3;
        } else if (constraints.maxWidth >= 700) {
          crossAxisCount = 2;
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: products.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.78,
          ),
          itemBuilder: (context, index) {
            final product = products[index];
            return _StoreProductCard(product: product);
          },
        );
      },
    );
  }
}

class _StoreProductCard extends StatelessWidget {
  const _StoreProductCard({required this.product});

  final StoreProduct product;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final showOldPrice =
        product.oldPrice != null && product.oldPrice! > product.price;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Image.network(
              product.image,
              fit: BoxFit.cover,
              errorBuilder: (context, _, __) => Container(
                color: theme.colorScheme.surfaceVariant,
                alignment: Alignment.center,
                child: Icon(
                  Icons.shopping_basket,
                  color: theme.colorScheme.onSurface.withOpacity(0.4),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (product.onSpecial)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.secondary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      'On special',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.secondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                if (product.onSpecial) const SizedBox(height: 12),
                Text(
                  product.name,
                  style: theme.textTheme.titleMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Text(
                  product.category,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text.rich(
                      TextSpan(
                        text: r'$',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                        children: [
                          TextSpan(
                            text: product.price.toStringAsFixed(2),
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      product.unit,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                if (showOldPrice)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text.rich(
                      TextSpan(
                        text: r'$',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          decoration: TextDecoration.lineThrough,
                        ),
                        children: [
                          TextSpan(
                            text: product.oldPrice!.toStringAsFixed(2),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: () {},
                  child: const Text('Add to cart'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreErrorState extends StatelessWidget {
  const _StoreErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, color: theme.colorScheme.error, size: 48),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StoreErrorBanner extends StatelessWidget {
  const _StoreErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onErrorContainer,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.tonal(
            onPressed: onRetry,
            style: FilledButton.styleFrom(
              backgroundColor:
                  theme.colorScheme.onErrorContainer.withOpacity(0.1),
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

enum StoreSortOption { nameAsc, nameDesc, priceAsc, priceDesc }

class _HeroSlide {
  const _HeroSlide({
    required this.imageUrl,
    required this.title,
    required this.description,
    required this.highlight,
    required this.category,
    required this.cta,
  });

  final String imageUrl;
  final String title;
  final String description;
  final String highlight;
  final String category;
  final String cta;
}

const List<_HeroSlide> _heroSlides = [
  _HeroSlide(
    imageUrl: 'https://valleyfarmsecrets.com/images/hero-produce.webp',
    title: 'Fresh Market Arrivals',
    description:
        'Hand-picked vegetables, crisp greens, and seasonal fruits landing in store daily.',
    highlight: 'Up to 25% off farm-fresh staples',
    category: 'Fruit & Veg',
    cta: 'Shop fresh produce',
  ),
  _HeroSlide(
    imageUrl: 'https://valleyfarmsecrets.com/images/gallery-2.webp',
    title: 'Master Butchery Cuts',
    description:
        'Premium beef, lamb, chicken, and braai packs prepared by our in-house butchers.',
    highlight: 'Bundle deals for the weekend braai',
    category: 'Butchery',
    cta: 'Explore the butchery',
  ),
  _HeroSlide(
    imageUrl: 'https://valleyfarmsecrets.com/images/gallery-4.webp',
    title: 'Pantry & Spice World',
    description:
        'Stock your shelves with Valley Farm Secrets groceries, spice blends, and everyday essentials.',
    highlight: 'Wholesale-ready pack sizes',
    category: 'Grocery & Spices',
    cta: 'Browse groceries',
  ),
];

enum QuickTileAction { viewSpecials, phone, none }

class _QuickTile {
  const _QuickTile({
    required this.title,
    required this.description,
    required this.icon,
    this.action = QuickTileAction.none,
    this.actionLabel,
    this.actionTarget,
    this.footer,
  });

  final String title;
  final String description;
  final IconData icon;
  final QuickTileAction action;
  final String? actionLabel;
  final String? actionTarget;
  final String? footer;
}

const List<_QuickTile> _quickTiles = [
  _QuickTile(
    title: 'Flash Deals',
    description:
        'Limited-time savings refreshed weekly across all departments.',
    icon: Icons.bolt,
    action: QuickTileAction.viewSpecials,
    actionLabel: 'View specials',
  ),
  _QuickTile(
    title: 'Wholesale Desk',
    description:
        'Bulk pricing, deliveries, and standing orders for institutions & restaurants.',
    icon: Icons.local_shipping,
    action: QuickTileAction.phone,
    actionLabel: 'Call +263 788 679 000',
    actionTarget: 'tel:+263788679000',
  ),
  _QuickTile(
    title: 'Store Hours',
    description: 'Mon-Sat: 8:00 AM - 7:00 PM',
    icon: Icons.schedule,
    footer: 'Visit us at 75 Main Street, Gweru.',
  ),
];

Future<void> _launchUrl(String? url) async {
  if (url == null || url.isEmpty) {
    return;
  }
  final uri = Uri.tryParse(url);
  if (uri == null) {
    return;
  }
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri);
  }
}

