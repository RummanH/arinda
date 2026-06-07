import { useState } from 'react';

export function useProductsViewModel(products) {
  const [search, setSearch] = useState('');
  const filteredProducts = products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase()));
  const veryLowProducts = products.filter((product) => product.stockPieces > 0 && product.stockPieces <= product.piecesPerCase);
  const outOfStockProducts = products.filter((product) => product.stockPieces === 0);

  return {
    search,
    setSearch,
    filteredProducts,
    veryLowProducts,
    outOfStockProducts,
  };
}
