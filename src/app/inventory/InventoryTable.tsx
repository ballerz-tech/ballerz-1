"use client";

import React, { useEffect, useState } from "react";
import { db, storage } from "../../../src/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc as firestoreDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Item = { id: string; [k: string]: any };

function formatValue(val: any) {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && typeof (val?.toDate) === "function") {
    try {
      return new Date(val.toDate()).toLocaleString();
    } catch (e) {
      return String(val);
    }
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default function InventoryTable() {
  // We only use the top-level `inventory` collection per user's request
  const selected = "inventory";
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editField, setEditField] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");
  const [editBoolValue, setEditBoolValue] = useState<boolean>(false);

  // Add modal visibility and form state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  type FormState = {
    Description: string;
    ID: string;
    ImageUrls: string[];
    Material: string;
    Price: string;
    Product: string;
    Size: string;
    Tag: string;
    CustomText: string;
    Customize: boolean;
    OriginalPrice: string;
    customprice: string;
  };
  const [form, setForm] = useState<FormState>({
    Description: "",
    ID: "",
    ImageUrls: [],
    Material: "",
    Price: "",
    Product: "",
    Size: "M",
    Tag: "",
    CustomText: "",
    Customize: false,
    OriginalPrice: "",
    customprice: "",
  });
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);

  // No filters / add-item UI — render whatever is in `inventory`

  // subscribe to the full `inventory` collection and apply client-side filters
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const colRef = collection(db!, "inventory");
    const unsub = onSnapshot(colRef, (snap) => {
      const rows: Item[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
      setAllItems(rows);
      setLoading(false);
    }, (e) => {
      const msg = String((e as any)?.message ?? e);
      if ((e as any)?.code === "permission-denied" || msg.toLowerCase().includes("permission")) {
        setError("Permission denied reading the inventory collection. Ensure Firestore rules allow reads for your user or sign in as an authorized user.");
      } else setError(msg);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // allItems is the live set pulled from Firestore; support a case-insensitive tag search
  const lowerSearch = (search || "").trim().toLowerCase();
  const filteredItems = lowerSearch
    ? allItems.filter((it) => ((it?.Tag ?? "") + "").toString().toLowerCase().includes(lowerSearch))
    : allItems;

  async function handleDelete(docId?: string) {
    if (!docId) return setError('Document id missing');
    if (!confirm('Delete this item?')) return;
    try {
      await deleteDoc(firestoreDoc(db!, 'inventory', docId));
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  function openEditModal(item: Item) {
    setEditItem(item);
    setEditField("");
    setEditValue("");
    setEditBoolValue(Boolean(item?.Customize));
    setShowEditModal(true);
  }

  function isNumericField(field: string) {
    return ["Price", "OriginalPrice", "customprice", "ID"].includes(field);
  }

  function isBooleanField(field: string) {
    return ["Customize"].includes(field);
  }

  async function handleEditSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!db) return setError("Firestore not initialized");
    if (!editItem || !editItem.id) return setError("No item selected for edit");
    if (!editField) return setError("Please select a field to update");

    try {
      const payload: any = {};
      if (isBooleanField(editField)) {
        payload[editField] = editBoolValue;
      } else if (isNumericField(editField)) {
        const num = Number(editValue);
        if (Number.isNaN(num)) {
          return setError("Please enter a valid number");
        }
        payload[editField] = num;
      } else {
        payload[editField] = editValue;
      }

      await updateDoc(firestoreDoc(db!, "inventory", editItem.id), payload);
      setShowEditModal(false);
      setEditItem(null);
      setEditField("");
      setEditValue("");
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }


  function updateForm<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function handleAddSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!db) return setError('Firestore not initialized');
    if (!form.Product) return setError('Please select a product category');
    try {
      // compute next ID automatically
      const existingIds = allItems.map((it) => Number(it?.ID ?? it?.id)).filter((n) => !isNaN(n));
      const maxId = existingIds.length ? Math.max(...existingIds) : 0;
      const nextId = maxId + 1;

      const payload: any = {
        Description: form.Description || "",
        ID: nextId,
        ImageUrl1: form.ImageUrls[0] || "",
        ImageUrl2: form.ImageUrls[1] || "",
        ImageUrl3: form.ImageUrls[2] || "",
        Material: form.Material || "",
        Price: form.Price ? Number(form.Price) : undefined,
        Product: form.Product || "",
        Size: form.Size || "",
        Tag: form.Tag || "",
        CustomText: form.CustomText || "",
        Customize: !!form.Customize,
        OriginalPrice: form.OriginalPrice ? Number(form.OriginalPrice) : undefined,
        customprice: form.customprice ? Number(form.customprice) : undefined,
        createdAt: serverTimestamp(),
      };
      // remove undefined fields
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      await addDoc(collection(db!, 'inventory'), payload);
      setShowAddModal(false);
      setForm({ Description: "", ID: "", ImageUrls: [], Material: "", Price: "", Product: "", Size: "M", Tag: "", CustomText: "", Customize: false, OriginalPrice: "", customprice: "" });
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="relative">
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-indigo-800">Inventory <span className="text-xs text-slate-500">({filteredItems.length})</span></h3>
          <div className="mt-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tags (e.g. chelsea)" className="w-full max-w-sm rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black" />
          </div>
        </div>

        {lowerSearch && filteredItems.length === 0 ? (
          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">No records found for "{search}"</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {filteredItems.map((it) => {
            const tags = (it?.Tag ?? "").toString().split(";").map((t: string) => t.trim()).filter(Boolean);
            const img = it?.ImageUrl1 || it?.ImageUrl2 || it?.ImageUrl3 || "/ob.png";
            return (
              <div key={it.id ?? it.ID ?? it.Product} className="relative flex gap-4 rounded-lg border p-4 bg-slate-50 border-slate-200 shadow-sm">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(it);
                  }}
                  aria-label="Edit item"
                  className="absolute left-2 bottom-2 z-20 rounded px-2 py-1 text-xs text-indigo-700 bg-white/90 hover:bg-indigo-50 border border-indigo-100"
                >
                  Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(it.id); }} aria-label="Delete item" className="absolute right-2 bottom-2 z-20 rounded px-2 py-1 text-xs text-red-600 bg-white/90 hover:bg-red-50 border border-red-100">Delete</button>
                <div className="w-36 flex-shrink-0">
                  <img src={img} alt={it?.Product ?? "item"} className="h-28 w-full object-cover rounded" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                      <div key={tag} className="rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{tag}</div>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-indigo-800">{it?.Product ?? "Untitled"}</div>
                    <div className="text-xs text-slate-400">ID: {it?.ID ?? it?.id}</div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{it?.Description}</div>
                  <div className="text-xs text-slate-400 mt-2">Created: {formatValue(it?.createdAt)}</div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
                    <div className="text-sm"><strong className="text-slate-600">Price:</strong> <span className="text-teal-600">{it?.Price ?? "-"}</span></div>
                    <div className="text-sm"><strong className="text-slate-600">Original Price:</strong> <span className="text-rose-600">{it?.OriginalPrice ?? "-"}</span></div>
                    <div className="text-sm"><strong className="text-slate-600">Custom Price:</strong> <span className="text-indigo-600">{it?.customprice ?? "-"}</span></div>
                    <div className="text-sm"><strong className="text-slate-600">Size:</strong> {it?.Size ?? "-"}</div>
                    <div className="text-sm"><strong className="text-slate-600">Material:</strong> {it?.Material ?? "-"}</div>
                    <div className="text-sm"><strong className="text-slate-600">Custom Text:</strong> {it?.CustomText ?? "-"}</div>
                    <div className="text-sm"><strong className="text-slate-600">Customize:</strong> {it?.Customize ? "Yes" : "No"}</div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Floating Add button (viewport bottom-right) */}
      <button onClick={() => setShowAddModal(true)} className="fixed right-6 bottom-6 z-40 rounded-full bg-indigo-600 p-3 text-white shadow-xl hover:bg-indigo-700">Add</button>

      {/* Edit modal */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black/30 to-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl ring-1 ring-indigo-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-indigo-800">Edit Inventory Item</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditItem(null);
                  setEditField("");
                  setEditValue("");
                }}
                className="text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <div className="text-xs text-slate-500">
                Editing: <span className="font-medium text-slate-700">{editItem.Product ?? "Untitled"}</span> (ID: {editItem.ID ?? editItem.id})
              </div>

              <div>
                <label className="block text-xs text-slate-600">Field to edit</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black"
                  value={editField}
                  onChange={(e) => {
                    const field = e.target.value;
                    setEditField(field);
                    if (!field) return;
                    const currentVal = (editItem as any)[field];
                    if (isBooleanField(field)) {
                      setEditBoolValue(Boolean(currentVal));
                    } else {
                      setEditValue(currentVal != null ? String(currentVal) : "");
                    }
                  }}
                >
                  <option value="">Select field</option>
                  <option value="Product">Product</option>
                  <option value="Description">Description</option>
                  <option value="Price">Price</option>
                  <option value="OriginalPrice">Original Price</option>
                  <option value="customprice">Custom Price</option>
                  <option value="Size">Size</option>
                  <option value="Material">Material</option>
                  <option value="CustomText">Custom Text</option>
                  <option value="Customize">Customize</option>
                  <option value="Tag">Tag</option>
                  <option value="ImageUrl1">ImageUrl1</option>
                  <option value="ImageUrl2">ImageUrl2</option>
                  <option value="ImageUrl3">ImageUrl3</option>
                </select>
              </div>

              {editField && (
                <div>
                  {isBooleanField(editField) ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="editCustomize"
                        checked={editBoolValue}
                        onChange={(e) => setEditBoolValue(e.target.checked)}
                      />
                      <label htmlFor="editCustomize" className="text-xs text-slate-600">
                        {editBoolValue ? "Yes (true)" : "No (false)"}
                      </label>
                    </div>
                  ) : (
                    <>
                      <label className="block text-xs text-slate-600 mt-2">New value</label>
                      <input
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={!editField}
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black/30 to-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl ring-1 ring-indigo-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-indigo-800">Add Inventory Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-sm text-slate-500">Close</button>
            </div>
            <form onSubmit={(e) => { handleAddSubmit(e); }} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-600">Product Category</label>
                <select className="mt-1 w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black" value={form.Product} onChange={(e) => updateForm('Product', e.target.value)}>
                  <option value="">Select Category</option>
                  <option value="Football">Football</option>
                  <option value="Anime">Anime</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Korean">Korean</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600">Product Name</label>
                <textarea className="mt-1 w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black" value={form.Description} onChange={(e) => updateForm('Description', e.target.value)} />
              </div>
              <ImageUploadSection
                category={form.Product}
                imageUrls={form.ImageUrls}
                onImagesChange={(urls) => updateForm('ImageUrls', urls)}
                uploading={uploadingImages}
                setUploading={setUploadingImages}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-600">Price</label>
                  <input type="number" className="mt-1 w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black" value={form.Price} onChange={(e) => updateForm('Price', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600">Original Price</label>
                  <input type="number" className="mt-1 w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black" value={form.OriginalPrice} onChange={(e) => updateForm('OriginalPrice', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-600">Size</label>
                  <select className="mt-1 w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={form.Size} onChange={(e) => updateForm('Size', e.target.value)}>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600">Custom Price</label>
                  <input type="number" className="mt-1 w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black" value={form.customprice} onChange={(e) => updateForm('customprice', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600">Custom Text</label>
                <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black" value={form.CustomText} onChange={(e) => updateForm('CustomText', e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="customize" checked={form.Customize} onChange={e => updateForm('Customize', e.target.checked)} />
                <label htmlFor="customize" className="text-xs text-slate-600">Customize</label>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50" disabled={uploadingImages}>
                  {uploadingImages ? 'Uploading...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Image Upload Component with Drag & Drop
function ImageUploadSection({
  category,
  imageUrls,
  onImagesChange,
  uploading,
  setUploading,
}: {
  category: string;
  imageUrls: string[];
  onImagesChange: (urls: string[]) => void;
  uploading: boolean;
  setUploading: (val: boolean) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    if (!category) {
      setUploadError("Please select a product category first");
      return;
    }

    if (!storage) {
      setUploadError("Storage not initialized");
      return;
    }

    setUploadError("");
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).slice(0, 3).map(async (file) => {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file`);
        }

        // Create a unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const extension = file.name.split(".").pop();
        const filename = `${timestamp}_${randomStr}.${extension}`;

        // Upload to storage in category folder
        const storageRef = ref(storage!, `products/${category}/${filename}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onImagesChange([...imageUrls, ...uploadedUrls].slice(0, 3));
    } catch (error: any) {
      setUploadError(error.message || "Error uploading images");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    onImagesChange(newUrls);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-600">Product Images (up to 3)</label>
      
      {uploadError && (
        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{uploadError}</div>
      )}

      {/* Preview uploaded images */}
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img src={url} alt={`Upload ${index + 1}`} className="w-full h-24 object-cover rounded border border-slate-200" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {imageUrls.length < 3 && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-indigo-500 bg-indigo-50"
              : "border-slate-300 hover:border-indigo-400"
          } ${!category ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => category && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={!category || uploading}
          />
          <div className="space-y-1">
            <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-sm text-slate-600">
              {uploading ? (
                <span className="font-medium text-indigo-600">Uploading...</span>
              ) : (
                <>
                  <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
                </>
              )}
            </div>
            <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
            {!category && <p className="text-xs text-amber-600 font-medium">Select category first</p>}
          </div>
        </div>
      )}
      
      <div className="text-xs text-slate-500">
        {imageUrls.length} of 3 images uploaded
      </div>
    </div>
  );
}
