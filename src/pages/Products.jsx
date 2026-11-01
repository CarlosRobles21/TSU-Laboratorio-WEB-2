import { useEffect, useState } from "react";

import ProductList from "../components/ProductList";

import {
  getProducts,
  searchProducts,
  getCategories,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../services/productService";

const EMPTY_FORM = { title: "", price: "", description: "" };
const LIMIT = 12;

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // GET /products?limit=&skip=
  async function loadProducts(pageNumber = 1) {
    try {
      setLoading(true);
      setError("");

      const skip = (pageNumber - 1) * LIMIT;
      const data = await getProducts(LIMIT, skip);

      setProducts(data.products);
      setTotal(data.total);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  // GET /products/categories
  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  }

  function nextPage() {
    if (page < totalPages) {
      const newPage = page + 1;

      setPage(newPage);
      loadProducts(newPage);
    }
  }

  function previousPage() {
    if (page > 1) {
      const newPage = page - 1;

      setPage(newPage);
      loadProducts(newPage);
    }
  }

  // DELETE /products/:id
  async function handleDelete(id) {
    try {
      setError("");

      const product = products.find((item) => item.id === id);

      // Los productos creados localmente no existen en el servidor
      if (!product?.local) {
        await deleteProduct(id);
      }

      setProducts(products.filter((item) => item.id !== id));
    } catch (error) {
      setError(error.message);
    }
  }

  // GET /products/search?q=
  async function handleSearch(event) {
    event.preventDefault();

    setCategory("");
    setPage(1);

    if (search.trim() === "") {
      await loadProducts(1);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await searchProducts(search);

      setProducts(data.products);
      setTotal(data.total);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  // GET /products/category/:category
  async function handleCategory(event) {
    const selectedCategory = event.target.value;

    setCategory(selectedCategory);
    setSearch("");
    setPage(1);

    if (selectedCategory === "") {
      await loadProducts(1);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getProductsByCategory(selectedCategory);

      setProducts(data.products);
      setTotal(data.total);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  }

  // POST /products/add
  async function handleCreate(event) {
    event.preventDefault();

    try {
      setError("");

      const newProduct = await createProduct({
        ...form,
        price: Number(form.price),
      });

      setProducts([
        {
          thumbnail: "https://placehold.co/300x180?text=Nuevo",
          category: "sin categoría",
          ...newProduct,
          local: true,
        },
        ...products,
      ]);

      setForm(EMPTY_FORM);
    } catch (error) {
      setError(error.message);
    }
  }

  function handleEdit(product) {
    setEditingId(product.id);

    setForm({
      title: product.title,
      price: product.price,
      description: product.description ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // PUT /products/:id
  async function handleUpdate(event) {
    event.preventDefault();

    try {
      setError("");

      const payload = { ...form, price: Number(form.price) };
      const current = products.find((item) => item.id === editingId);

      // Los productos locales no existen en el servidor (PUT daría 404)
      const updated = current?.local
        ? payload
        : await updateProduct(editingId, payload);

      setProducts(
        products.map((product) =>
          product.id === editingId ? { ...product, ...updated } : product
        )
      );

      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <section>
      <h1>Productos</h1>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <button type="submit">Buscar</button>
      </form>

      <select value={category} onChange={handleCategory}>
        <option value="">Todas las categorías</option>

        {categories.map((item) => {
          const value = item.slug ?? item;
          const label = item.name ?? item;

          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>

      <h2>{editingId ? "Editar producto" : "Agregar producto"}</h2>

      <form
        onSubmit={editingId ? handleUpdate : handleCreate}
        className="product-form"
      >
        <input
          type="text"
          name="title"
          placeholder="Nombre"
          value={form.title}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Precio"
          value={form.price}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Descripción"
          value={form.description}
          onChange={handleChange}
        />

        <button type="submit">{editingId ? "Actualizar" : "Guardar"}</button>

        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Cargando productos...</p>
      ) : (
        <ProductList
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {!search && !category && (
        <div className="pagination">
          <button onClick={previousPage} disabled={page === 1 || loading}>
            Anterior
          </button>

          <span>Página {page}</span>

          <button
            onClick={nextPage}
            disabled={page >= totalPages || loading}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
}

export default Products;
