import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const PC_CATEGORIES = [
  "Home care",
  "Personal care & Health care",
  "Fragrances",
  "Baby care & Men's care",
  "Intimate apparel",
  "Cosmetics",
];

export default function ProductsPage({ user }) {
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add-product form
  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [variantName, setVariantName] = useState("");
  const [volume, setVolume] = useState("");

  // Editing state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadBrandsAndProducts();
  }, [user]);

  async function loadBrandsAndProducts() {
    if (!user) return;
    setLoading(true);

    const sellerId = user.id;

    const [brandRes, prodRes] = await Promise.all([
      supabase
        .from("brands")
        .select("id, name")
        .eq("seller_id", sellerId)
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select(
          `
          id,
          seller_id,
          brand_id,
          name,
          category,
          type,
          variant_name,
          volume,
          brands!brand_id (id, name)
        `
        )
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false }),
    ]);

    if (brandRes.error) {
      console.error(brandRes.error);
      alert("Error loading brands: " + brandRes.error.message);
    } else {
      setBrands(brandRes.data || []);
    }

    if (prodRes.error) {
      console.error(prodRes.error);
      alert("Error loading products: " + prodRes.error.message);
    } else {
      setProducts(prodRes.data || []);
    }

    setLoading(false);
  }

  function getBrandById(id) {
    if (!id) return null;
    return brands.find((b) => b.id === id) || null;
  }

  const selectedBrand = getBrandById(brandId);
  const isPCBrand =
    selectedBrand &&
    selectedBrand.name.toLowerCase().includes("personal collection");

  async function handleAddProduct(e) {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      alert("Please enter a product name.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("products").insert({
      seller_id: user.id,
      brand_id: brandId || null,
      name: name.trim(),
      category: category.trim() || null,
      type: type.trim() || null,
      variant_name: variantName.trim() || null,
      volume: volume.trim() || null,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Error saving product: " + error.message);
      return;
    }

    // reset form
    setBrandId("");
    setName("");
    setCategory("");
    setType("");
    setVariantName("");
    setVolume("");

    loadBrandsAndProducts();
  }

  async function handleDeleteProduct(id) {
    if (!user) return;
    if (!window.confirm("Delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("seller_id", user.id);

    if (error) {
      console.error(error);
      alert("Error deleting product: " + error.message);
      return;
    }

    // if we were editing this product, close edit mode
    if (editingProduct && editingProduct.id === id) {
      setEditingProduct(null);
    }

    loadBrandsAndProducts();
  }

  // --- Editing helpers ---

  function startEditing(product) {
    setEditingProduct({
      id: product.id,
      brand_id: product.brand_id || "",
      name: product.name || "",
      category: product.category || "",
      type: product.type || "",
      variant_name: product.variant_name || "",
      volume: product.volume || "",
    });
  }

  function cancelEditing() {
    setEditingProduct(null);
  }

  function handleEditFieldChange(field, value) {
    setEditingProduct((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function saveEditedProduct() {
    if (!user || !editingProduct) return;

    if (!editingProduct.name.trim()) {
      alert("Product name is required.");
      return;
    }

    setEditSaving(true);

    const { error } = await supabase
      .from("products")
      .update({
        brand_id: editingProduct.brand_id || null,
        name: editingProduct.name.trim(),
        category: editingProduct.category.trim() || null,
        type: editingProduct.type.trim() || null,
        variant_name: editingProduct.variant_name.trim() || null,
        volume: editingProduct.volume.trim() || null,
      })
      .eq("id", editingProduct.id)
      .eq("seller_id", user.id);

    setEditSaving(false);

    if (error) {
      console.error(error);
      alert("Error updating product: " + error.message);
      return;
    }

    setEditingProduct(null);
    loadBrandsAndProducts();
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      {/* Add product card */}
      <section className="card">
        <h2 className="card-title">Add product</h2>

        {brands.length === 0 && (
          <p className="text-muted">
            You need at least one brand to attach products to. Add a brand in
            the Brands tab first.
          </p>
        )}

        <form onSubmit={handleAddProduct}>
          {/* Brand (optional) */}
          <select
            className="field"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              // reset category when switching brands
              setCategory("");
            }}
          >
            <option value="">No brand / generic</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Name */}
          <input
            className="field"
            placeholder="Product name (required)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Category – dropdown for PC, text for others */}
          {isPCBrand ? (
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              {PC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="field"
              placeholder="Category (e.g. Personal care, Home care)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          )}

          {/* Type / variant / volume */}
          <input
            className="field"
            placeholder="Type (e.g. shampoo, lotion) – optional"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />

          <input
            className="field"
            placeholder="Variant (e.g. cherry blossom) – optional"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
          />

          <input
            className="field"
            placeholder="Volume / size (e.g. 250ml) – optional"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
          />

          <div className="order-save-row">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || brands.length === 0}
            >
              {saving ? "Saving…" : "Add product"}
            </button>
          </div>
        </form>
      </section>

      {/* Products list */}
      <section className="card">
        <h2 className="card-title">Products</h2>
        {loading ? (
          <p className="text-muted">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-muted">No products yet.</p>
        ) : (
          <ul className="customer-list">
            {products.map((p) => {
              const isEditing = editingProduct && editingProduct.id === p.id;

              if (isEditing) {
                const editingBrand = getBrandById(editingProduct.brand_id);
                const isEditingPC =
                  editingBrand &&
                  editingBrand.name
                    .toLowerCase()
                    .includes("personal collection");

                return (
                  <li key={p.id} className="customer-item">
                    <div className="order-item-top">
                      <div className="order-left">
                        {/* Brand select */}
                        <select
                          className="field"
                          value={editingProduct.brand_id || ""}
                          onChange={(e) =>
                            handleEditFieldChange("brand_id", e.target.value)
                          }
                        >
                          <option value="">No brand / generic</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>

                        <input
                          className="field"
                          placeholder="Product name"
                          value={editingProduct.name}
                          onChange={(e) =>
                            handleEditFieldChange("name", e.target.value)
                          }
                        />

                        {/* Category – dropdown for PC brand */}
                        {isEditingPC ? (
                          <select
                            className="field"
                            value={editingProduct.category || ""}
                            onChange={(e) =>
                              handleEditFieldChange("category", e.target.value)
                            }
                          >
                            <option value="">Select category</option>
                            {PC_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="field"
                            placeholder="Category"
                            value={editingProduct.category || ""}
                            onChange={(e) =>
                              handleEditFieldChange("category", e.target.value)
                            }
                          />
                        )}

                        <input
                          className="field"
                          placeholder="Type"
                          value={editingProduct.type || ""}
                          onChange={(e) =>
                            handleEditFieldChange("type", e.target.value)
                          }
                        />

                        <input
                          className="field"
                          placeholder="Variant"
                          value={editingProduct.variant_name || ""}
                          onChange={(e) =>
                            handleEditFieldChange(
                              "variant_name",
                              e.target.value
                            )
                          }
                        />

                        <input
                          className="field"
                          placeholder="Volume / size"
                          value={editingProduct.volume || ""}
                          onChange={(e) =>
                            handleEditFieldChange("volume", e.target.value)
                          }
                        />
                      </div>

                      <div className="order-money">
                        <button
                          type="button"
                          className="btn-secondary btn-small"
                          onClick={cancelEditing}
                          disabled={editSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary btn-small"
                          onClick={saveEditedProduct}
                          disabled={editSaving}
                          style={{ marginLeft: "0.5rem" }}
                        >
                          {editSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              }

              // --- Normal view row ---
              return (
                <li key={p.id} className="customer-item">
                  <div className="order-item-top">
                    <div className="order-left">
                      <div className="customer-name">{p.name}</div>
                      <div className="order-meta">
                        {p.brands?.name || "No brand"}
                        {p.category ? ` • ${p.category}` : ""}
                      </div>
                      <div className="order-meta">
                        {[p.type, p.variant_name, p.volume]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>

                    <div className="order-money">
                      <button
                        type="button"
                        className="btn-secondary btn-small"
                        onClick={() => startEditing(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-small"
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{ marginLeft: "0.5rem" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
