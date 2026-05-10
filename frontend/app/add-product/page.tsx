'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  API_BASE_URL,
  buildLoginRedirectUrl,
  clearLegacyToken,
  getValidLegacyToken,
  hasActiveSession,
} from '../../lib/auth';
import LocationPicker from '../components/location/LocationPicker';

type ListingType = 'product' | 'service';

type Category = {
  id: number;
  name: string;
  type: ListingType;
  is_active?: boolean;
};

type FormState = {
  title: string;
  description: string;
  price: string;
  listingType: ListingType;
  categoryId: string;
  stock: string;
  durationMinutes: string;
  latitude: string;
  longitude: string;
  address: string;
  image: File | null;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const INITIAL_FORM: FormState = {
  title: '',
  description: '',
  price: '',
  listingType: 'product',
  categoryId: '',
  stock: '',
  durationMinutes: '60',
  latitude: '',
  longitude: '',
  address: '',
  image: null,
};

const normalizeToken = (rawToken: string | null) => rawToken?.replace(/^Bearer\s+/i, '').trim() || '';

const getErrorMessage = async (response: Response, context = 'request') => {
  const fallback = `Request failed (${response.status})`;
  try {
    const data = await response.json();
    console.error(`[AddProduct] ${context} failed`, {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((item: any) => item?.msg)
        .filter(Boolean)
        .join(', ') || fallback;
    }
    if (typeof data?.message === 'string') return data.message;
    return fallback;
  } catch {
    console.error(`[AddProduct] ${context} failed with non-JSON response`, {
      status: response.status,
      statusText: response.statusText,
    });
    return fallback;
  }
};

export default function AddProductPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summaryError, setSummaryError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === form.listingType),
    [categories, form.listingType],
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === form.categoryId),
    [categories, form.categoryId],
  );

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      const active = await hasActiveSession();
      if (!mounted) return;
      if (!active) {
        toast.error('Please login to create a listing');
        router.replace(buildLoginRedirectUrl(pathname || '/add-product'));
        return;
      }
      setAuthChecking(false);
    };

    void checkAuth();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/categories/`);
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'Load categories'));
        }
        const data = (await response.json()) as Category[];
        if (!mounted) return;
        setCategories(data.filter((cat) => cat.is_active !== false));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load categories';
        if (!mounted) return;
        setSummaryError(message);
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    };

    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSummaryError('');
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    if (name === 'listingType') {
      const type = value as ListingType;
      setForm((prev) => ({
        ...prev,
        listingType: type,
        categoryId: '',
      }));
      setErrors((prev) => ({ ...prev, listingType: undefined, categoryId: undefined }));
      return;
    }

    updateField(name as keyof FormState, value as never);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      updateField('image', null);
      setImagePreviewUrl(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      updateField('image', null);
      setErrors((prev) => ({ ...prev, image: 'Only JPG, PNG, or WEBP images are allowed' }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      updateField('image', null);
      setErrors((prev) => ({ ...prev, image: 'Image size must be less than 5 MB' }));
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    updateField('image', file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    updateField('image', null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const handleLocationChange = (next: { latitude?: string; longitude?: string; address?: string }) => {
    if (next.latitude !== undefined) updateField('latitude', next.latitude);
    if (next.longitude !== undefined) updateField('longitude', next.longitude);
    if (next.address !== undefined) updateField('address', next.address);
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (!form.description.trim()) nextErrors.description = 'Description is required';

    const parsedPrice = Number(form.price);
    if (!form.price.trim()) {
      nextErrors.price = 'Price is required';
    } else if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      nextErrors.price = 'Price must be greater than 0';
    }

    if (!form.listingType) nextErrors.listingType = 'Listing type is required';

    if (!form.categoryId) {
      nextErrors.categoryId = 'Category is required';
    } else if (!selectedCategory) {
      nextErrors.categoryId = 'Selected category is invalid';
    } else if (selectedCategory.type !== form.listingType) {
      nextErrors.categoryId = `Please select a ${form.listingType} category`;
    }

    if (form.listingType === 'product') {
      if (form.stock.trim() === '') {
        nextErrors.stock = 'Stock is required for product listings';
      } else if (Number.isNaN(Number(form.stock)) || Number(form.stock) < 0) {
        nextErrors.stock = 'Stock must be 0 or more';
      }
    } else if (form.durationMinutes.trim() && Number(form.durationMinutes) <= 0) {
      nextErrors.durationMinutes = 'Duration must be greater than 0 minutes';
    }

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!form.latitude || Number.isNaN(lat) || lat < -90 || lat > 90) {
      nextErrors.latitude = 'Latitude is required and must be between -90 and 90';
    }
    if (!form.longitude || Number.isNaN(lng) || lng < -180 || lng > 180) {
      nextErrors.longitude = 'Longitude is required and must be between -180 and 180';
    }

    if (form.image) {
      if (!ACCEPTED_IMAGE_TYPES.includes(form.image.type)) {
        nextErrors.image = 'Only JPG, PNG, or WEBP images are allowed';
      } else if (form.image.size > MAX_IMAGE_SIZE) {
        nextErrors.image = 'Image size must be less than 5 MB';
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSummaryError('Please fix the highlighted fields before submitting.');
      return false;
    }

    return true;
  };

  const createListingRecord = async (token: string, payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/listings/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Create listing'));
    }

    return response.json();
  };

  const updateSellerLocation = async (token: string, latitude: number, longitude: number) => {
    await fetch(
      `${API_BASE_URL}/api/v1/sellers/me/location?latitude=${latitude}&longitude=${longitude}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const token = normalizeToken(getValidLegacyToken());
    if (!token) {
      toast.error('Your session expired. Please login again.');
      router.replace(buildLoginRedirectUrl(pathname || '/add-product'));
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setSummaryError('');
    setSuccessMessage('');

    const numericPrice = Number(form.price);
    const numericStock = Number(form.stock || 0);
    const numericDuration = Number(form.durationMinutes || 60);
    const numericCategory = Number(form.categoryId);
    if (Number.isNaN(numericCategory)) {
      setErrors((prev) => ({ ...prev, categoryId: 'Category is required' }));
      setSummaryError('Please select a valid category.');
      setSubmitting(false);
      return;
    }

    if (!selectedCategory || selectedCategory.type !== form.listingType) {
      setErrors((prev) => ({ ...prev, categoryId: `Please select a valid ${form.listingType} category` }));
      setSummaryError(`Selected category does not match ${form.listingType} listing type.`);
      setSubmitting(false);
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    try {
      if (form.listingType === 'product') {
        const productData = new FormData();
        productData.append('name', form.title.trim());
        productData.append('description', form.description.trim());
        productData.append('price', String(numericPrice));
        productData.append('category', String(numericCategory));
        productData.append('stock', String(numericStock));
        productData.append('latitude', String(latitude));
        productData.append('longitude', String(longitude));
        if (form.image) productData.append('image', form.image);

        const productResponse = await fetch(`${API_BASE_URL}/api/v1/products/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: productData,
        });

        if (!productResponse.ok) {
          if (productResponse.status === 401) {
            clearLegacyToken();
            throw new Error('Unauthorized. Please login again.');
          }
          throw new Error(await getErrorMessage(productResponse, 'Create product'));
        }

        const product = await productResponse.json();

        await createListingRecord(token, {
          title: form.title.trim(),
          description: form.description.trim(),
          price: numericPrice,
          type: 'product',
          stock: numericStock,
          latitude,
          longitude,
          address: form.address.trim() || null,
          source_id: product.id,
          source_type: 'product',
        });
      } else {
        const serviceResponse = await fetch(`${API_BASE_URL}/api/v1/services/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.title.trim(),
            description: form.description.trim(),
            price: numericPrice,
            duration_minutes: numericDuration,
            category_id: Number.isNaN(numericCategory) ? null : numericCategory,
            latitude,
            longitude,
            address: form.address.trim() || null,
          }),
        });

        if (!serviceResponse.ok) {
          if (serviceResponse.status === 401) {
            clearLegacyToken();
            throw new Error('Unauthorized. Please login again.');
          }
          throw new Error(await getErrorMessage(serviceResponse, 'Create service'));
        }

        const service = await serviceResponse.json();

        await createListingRecord(token, {
          title: form.title.trim(),
          description: form.description.trim(),
          price: numericPrice,
          type: 'service',
          duration_minutes: numericDuration,
          source_id: service.id,
          source_type: 'service',
          latitude,
          longitude,
          address: form.address.trim() || null,
        });

        await updateSellerLocation(token, latitude, longitude);
      }

      setSuccessMessage('Listing created successfully. Redirecting to My Listings...');
      toast.success('Listing created successfully');
      setTimeout(() => router.push('/my-products'), 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create listing';
      setSummaryError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <div className="ds-card text-sm text-slate-600">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-container mx-auto max-w-4xl">
        <header className="ds-hero-card mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Add Product / Service Listing</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Create a new product or service listing for your store
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {summaryError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {summaryError}
            </div>
          )}
          {successMessage && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <section className="ds-card">
            <h2 className="ds-title">Basic Information</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="ds-label" htmlFor="title">
                  Listing title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Fresh Mango Box 5kg"
                  className="ds-input"
                />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="ds-label" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Describe your product or service clearly..."
                  className="ds-input min-h-28"
                />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
              </div>
            </div>
          </section>

          <section className="ds-card">
            <h2 className="ds-title">Category & Type</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="ds-label" htmlFor="listingType">
                  Listing type
                </label>
                <select
                  id="listingType"
                  name="listingType"
                  value={form.listingType}
                  onChange={handleInputChange}
                  className="ds-input"
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
                {errors.listingType && <p className="mt-1 text-xs text-red-600">{errors.listingType}</p>}
              </div>

              <div>
                <label className="ds-label" htmlFor="categoryId">
                  Category
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleInputChange}
                  disabled={categoriesLoading}
                  className="ds-input disabled:bg-slate-100"
                >
                  <option value="">{categoriesLoading ? 'Loading categories...' : 'Select category'}</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>}
              </div>
            </div>
          </section>

          <section className="ds-card">
            <h2 className="ds-title">Pricing & Inventory</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="ds-label" htmlFor="price">
                  Price (₹)
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleInputChange}
                  placeholder="Enter price in ₹"
                  className="ds-input"
                />
                {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
              </div>

              {form.listingType === 'product' ? (
                <div>
                  <label className="ds-label" htmlFor="stock">
                    Stock quantity
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={handleInputChange}
                    placeholder="e.g. 25"
                    className="ds-input"
                  />
                  <p className="ds-note">Enter how many units are currently available.</p>
                  {errors.stock && <p className="mt-1 text-xs text-red-600">{errors.stock}</p>}
                </div>
              ) : (
                <div>
                  <label className="ds-label" htmlFor="durationMinutes">
                    Service duration (minutes)
                  </label>
                  <input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min="1"
                    value={form.durationMinutes}
                    onChange={handleInputChange}
                    className="ds-input"
                  />
                  <p className="ds-note">Duration helps buyers understand booking time.</p>
                  {errors.durationMinutes && <p className="mt-1 text-xs text-red-600">{errors.durationMinutes}</p>}
                </div>
              )}
            </div>
          </section>

          <LocationPicker
            label="Location"
            helperText={`Choose ${form.listingType === 'product' ? 'product' : 'service'} location by searching, using current location, or tapping on the map`}
            latitude={form.latitude}
            longitude={form.longitude}
            address={form.address}
            latitudeError={errors.latitude}
            longitudeError={errors.longitude}
            onChange={handleLocationChange}
          />

          <section className="ds-card">
            <h2 className="ds-title">Media Upload</h2>
            <p className="ds-note">
              Upload a clear image (JPG, PNG, WEBP; max 5 MB). This is currently supported for product listings.
            </p>

            <div className="mt-4">
              <input
                id="image"
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
              />
              {errors.image && <p className="mt-1 text-xs text-red-600">{errors.image}</p>}

              {form.image && (
                <div className="mt-3 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-600">Selected file: {form.image.name}</p>
                  {imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="Selected preview"
                      className="mt-2 h-32 w-32 rounded-md object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="mt-3 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="ds-card">
            <h2 className="ds-title">Final Submit</h2>
            <p className="ds-note">
              Review your details before creating your listing.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                disabled={submitting}
                className="ds-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? 'Creating Listing...' : 'Create Listing'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/my-products')}
                className="ds-btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}