'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@payloadcms/ui'
import { 
  Plus, 
  X, 
  Gift, 
  Tag, 
  ShoppingBag, 
  User, 
  Phone, 
  MapPin, 
  Globe, 
  MessageSquare,
  Sparkles,
  Check,
  AlertCircle,
  Package,
  Percent,
  DollarSign,
  ChevronDown,
  ExternalLink,
  Trash2,
  Mail,
} from 'lucide-react'
import type { Product, Variant } from '@/payload-types'
import './index.css'

const defaultGovernorats = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kebili'
]

interface ProductItem {
  id: string
  quantity: number
  variantId?: string
  attributes?: string
  price?: number | null
  variantName?: string
}

interface OrderDiscount {
  value: number
  type: 'amount' | 'percent'
}

interface BirthDate {
  id: string
  date: string
  label: string
}

interface PromoCode {
  id: string
  promoCode: string
  discountType: 'percentage' | 'amount'
  discountValue: number
  active?: boolean
  valid?: boolean
  startDate?: string | null
  endDate?: string | null
  usageCodeLimit?: number | null
  usageCount?: number | null
  minOrderValue?: number | null
  maxDiscount?: number | null
  products?: (string | { id: string })[] | null
}

const CreateOrderButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<'customer' | 'products'>('customer')
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerGouvernorat: '',
    source: 'website',
    note: '',
    products: [] as ProductItem[],
    totalAmount: 0,
  })

  // Birth dates state
  const [birthDates, setBirthDates] = useState<BirthDate[]>([
    { id: '1', date: '', label: '' }
  ])

  const [products, setProducts] = useState<Product[]>([])
  const [attributeValues, setAttributeValues] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  /** Popup alert shown on validation / stock errors */
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // Entrée dans la recherche : ajout direct par référence produit (barcode) ou SKU de variante
  const [referenceStatus, setReferenceStatus] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)
  const [isSearchingReference, setIsSearchingReference] = useState(false)
  const [referenceInput, setReferenceInput] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const referenceInputRef = useRef<HTMLInputElement>(null)

  // Global order discount state
  const [orderDiscount, setOrderDiscount] = useState<OrderDiscount>({
    value: 0,
    type: 'amount'
  })

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null)
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)

  // Calculate subtotal (before any discount)
  const subtotal = useMemo(() => {
  let total = 0

  for (const item of formData.products) {
    const product = products.find(p => p.id === item.id)

    if(product){
      const price = item.price || product.currentPrice || 0
      total += price * item.quantity
    }
  }

  return total
}, [formData.products, products])
  // Calculate promo code discount (respects product scope + maxDiscount)
  const promoDiscount = useMemo(() => {
    if (!appliedPromoCode) return 0

    const allowedIds = (appliedPromoCode.products || [])
      .map((p) => (typeof p === 'string' ? p : p?.id))
      .filter(Boolean)
      .map(String)

    let base = subtotal
    if (allowedIds.length > 0) {
      const applicable = formData.products.filter((item) => allowedIds.includes(String(item.id)))
      if (applicable.length === 0) return 0
      base = applicable.reduce((total, item) => {
        const product = products.find((p) => p.id === item.id)
        const price = item.price || product?.currentPrice || 0
        return total + price * item.quantity
      }, 0)
    }

    if (base <= 0) return 0

    let discount = 0
    if (appliedPromoCode.discountType === 'percentage') {
      discount = base * (appliedPromoCode.discountValue / 100)
      if (appliedPromoCode.maxDiscount != null && appliedPromoCode.maxDiscount > 0) {
        discount = Math.min(discount, appliedPromoCode.maxDiscount)
      }
    } else {
      discount = Math.min(appliedPromoCode.discountValue, base)
    }

    return Math.max(0, Math.round(discount * 100) / 100)
  }, [appliedPromoCode, formData.products, products, subtotal])

  // Calculate manual discount
  const manualDiscount = useMemo(() => {
    if (orderDiscount.value <= 0) return 0
    if (orderDiscount.type === 'percent') {
      return subtotal * (orderDiscount.value / 100)
    }
    return orderDiscount.value
  }, [subtotal, orderDiscount])

  // Frais de livraison : réglage boutique, lu une fois à l'ouverture. Un
  // réglage injoignable laisse 0 plutôt que de gonfler un total au hasard.
  const [deliveryFee, setDeliveryFee] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetch('/api/globals/shop-settings?depth=0')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const fee = Number(data?.deliveryFee)
        if (!cancelled && Number.isFinite(fee) && fee >= 0) setDeliveryFee(fee)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  // Calculate total amount after all discounts
  const totalAmount = useMemo(() => {
    const afterPromo = Math.max(0, subtotal - promoDiscount)
    const afterManual = Math.max(0, afterPromo - manualDiscount)
    // Les remises portent sur les articles, la livraison s'ajoute ensuite.
    return afterManual + deliveryFee
  }, [subtotal, promoDiscount, manualDiscount, deliveryFee])

  // Update formData.totalAmount when totalAmount changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalAmount: totalAmount
    }))
  }, [totalAmount])

  // Fetch products for the dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
       const response = await fetch('/api/products?limit=100&depth=5')
        const data = await response.json()
        if (data.docs) {
          setProducts(data.docs)
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }
    fetchProducts()
  }, [])

  // Fetch attribute values for variants
  useEffect(() => {
    const fetchAttributeValues = async () => {
      try {
        const response = await fetch('/api/attributeValues?limit=1000')
        const data = await response.json()
        if (data.docs) {
          setAttributeValues(data.docs)
        }
      } catch (error) {
        console.error('Error fetching attribute values:', error)
      }
    }
    fetchAttributeValues()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isModalOpen])

  // Calculate dropdown position when open
  useEffect(() => {
    if (isProductDropdownOpen && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isProductDropdownOpen])

  const handleOpenModal = () => {
    setIsModalOpen(true)
    setCurrentStep('customer')
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setCurrentStep('customer')
    setAlertMessage(null)
  }

  const showAlert = (message: string) => {
    setAlertMessage(message)
    setError(message)
  }

  const dismissAlert = () => {
    setAlertMessage(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError(null)
    if (alertMessage) setAlertMessage(null)
  }

  // Handle birth date changes
  const handleBirthDateChange = (id: string, date: string) => {
    setBirthDates(prev =>
      prev.map(bd =>
        bd.id === id ? { ...bd, date } : bd
      )
    )
  }

  // Add new birth date field
  const addBirthDate = () => {
    if (birthDates.length >= 2) return
    const newId = String(Date.now())
    setBirthDates(prev => [
      ...prev,
      { id: newId, date: '', label: '' }
    ])
  }

  // Remove birth date field
  const removeBirthDate = (id: string) => {
    if (birthDates.length <= 1) return
    setBirthDates(prev => prev.filter(bd => bd.id !== id))
  }

  // Validate and apply promo code (shared API — dates, active, usage, min order, products)
  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      setPromoCodeError('Veuillez entrer un code promo')
      return
    }

    setIsValidatingPromo(true)
    setPromoCodeError(null)

    try {
      const productIds = formData.products.map((p) => p.id)
      const lineItems = formData.products.map((item) => {
        const product = products.find((p) => p.id === item.id)
        const price = item.price || product?.currentPrice || 0
        return {
          productId: item.id,
          lineTotal: price * item.quantity,
        }
      })

      const response = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          cartTotal: subtotal,
          productIds,
          lineItems,
        }),
      })
      const data = await response.json()

      if (data.ok && data.promo) {
        setAppliedPromoCode(data.promo as PromoCode)
        setPromoCodeError(null)
      } else {
        setPromoCodeError(data.message || 'Code promo invalide')
        setAppliedPromoCode(null)
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoCodeError('Erreur lors de la validation du code promo')
      setAppliedPromoCode(null)
    } finally {
      setIsValidatingPromo(false)
    }
  }

  // Remove applied promo code
  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null)
    setPromoCodeInput('')
    setPromoCodeError(null)
  }

  /** Open product dropdown: reset search so the full list is visible again */
  const openProductDropdown = () => {
    setSearchTerm('')
    setReferenceStatus(null)
    setIsProductDropdownOpen(true)
  }

  /** Add a product (already-added products are hidden from the list — no toggle-off here) */
  const toggleProduct = (productId: string) => {
    const product = products.find((p) => String(p.id) === String(productId))
    if (product) addProductToOrder(product)

    // Reset search + close so next "Ajouter un produit" shows the full list again
    setSearchTerm('')
    setIsProductDropdownOpen(false)
  }

  /** Ajoute une ligne produit, avec sa variante déjà choisie quand on la connaît (SKU scanné). */
  const addProductToOrder = (product: Product, variant?: any) => {
    setFormData((prev) => {
      if (prev.products.some((item) => String(item.id) === String(product.id))) return prev

      return {
        ...prev,
        products: [
          ...prev.products,
          {
            id: product.id,
            quantity: 1,
            variantId: variant?.id,
            price: variant?.price ?? product.currentPrice ?? 0,
            variantName: variant ? getVariantLabel(variant) : '',
            attributes: variant ? getVariantAttributes(variant) : '',
          },
        ],
      }
    })

    if (appliedPromoCode) {
      handleRemovePromoCode()
    }

    if (error) setError(null)
  }

  /** Resolve variants list from product (join field or array) */
  const getProductVariants = (product: any): any[] => {
    if (!product) return []
    if (Array.isArray(product?.variants?.docs)) return product.variants.docs
    if (Array.isArray(product?.variants)) return product.variants
    return []
  }

  /** Références comparées sans espaces ni casse : "pk 1234" = "PK1234". */
  const normalizeReference = (value: unknown) =>
    String(value ?? '').replace(/\s+/g, '').toLowerCase()

  /**
   * Cherche d'abord la référence produit, puis la référence d'une variante
   * (code-barres de la taille) et enfin son SKU. Une variante trouvée est
   * ajoutée directement avec la bonne taille.
   */
  const findByReference = (list: Product[], reference: string) => {
    for (const product of list) {
      if (normalizeReference(product.barcode) === reference) return { product, variant: undefined }
    }
    for (const field of ['reference', 'sku'] as const) {
      for (const product of list) {
        const variant = getProductVariants(product).find(
          (v: any) => v && typeof v === 'object' && v[field] && normalizeReference(v[field]) === reference,
        )
        if (variant) return { product, variant }
      }
    }
    return null
  }

  /** Seuls 100 produits sont préchargés : au-delà, on interroge l'API. */
  const fetchByReference = async (raw: string) => {
    const query = encodeURIComponent(raw)

    const byBarcode = await fetch(
      `/api/products?where[barcode][equals]=${query}&depth=5&limit=1`,
    ).then((res) => (res.ok ? res.json() : null))
    if (byBarcode?.docs?.[0]) return byBarcode.docs[0] as Product

    // Référence de variante (enregistrée sans espaces) ou SKU.
    const compact = encodeURIComponent(raw.replace(/\s+/g, ''))
    const byVariant = await fetch(
      `/api/variants?where[or][0][reference][equals]=${compact}&where[or][1][sku][equals]=${query}&depth=0&limit=1`,
    ).then((res) => (res.ok ? res.json() : null))
    const variant = byVariant?.docs?.[0]
    const productId = variant && (typeof variant.product === 'object' ? variant.product?.id : variant.product)
    if (!productId) return null

    const product = await fetch(`/api/products/${productId}?depth=5`).then((res) =>
      res.ok ? res.json() : null,
    )
    return (product as Product) || null
  }

  /**
   * Ajoute un produit par référence (barcode produit, référence ou SKU de variante).
   * @param source - 'dropdown' utilise searchTerm ; 'field' utilise referenceInput (champ dédié).
   */
  const handleAddByReference = async (source: 'dropdown' | 'field' = 'dropdown') => {
    const raw = (source === 'field' ? referenceInput : searchTerm).trim()
    const reference = normalizeReference(raw)
    if (!reference || isSearchingReference) return

    setIsSearchingReference(true)
    setReferenceStatus(null)

    try {
      let match = findByReference(products, reference)

      if (!match) {
        const fetched = await fetchByReference(raw).catch(() => null)
        if (fetched) {
          setProducts((prev) =>
            prev.some((p) => String(p.id) === String(fetched.id)) ? prev : [...prev, fetched],
          )
          match = findByReference([fetched], reference)
        }
      }

      if (!match) {
        setReferenceStatus({ type: 'error', message: `Aucune référence « ${raw} ».` })
        return
      }

      const { product, variant } = match
      // Toujours la référence produit dans les messages, même si c'est un SKU de variante qui a matché.
      const label = `${product.productTitle}${variant ? ` (${getVariantLabel(variant)})` : ''}${
        product.barcode ? ` — Réf : ${product.barcode}` : ''
      }`
      const existing = formData.products.find((item) => String(item.id) === String(product.id))

      if (existing) {
        // Même article scanné une deuxième fois → une unité de plus.
        if (!variant || String(existing.variantId) === String(variant.id)) {
          updateProductQuantity(existing.id, existing.quantity + 1)
          setReferenceStatus({ type: 'success', message: `Quantité augmentée : ${label}` })
        } else {
          setReferenceStatus({
            type: 'error',
            message: `« ${product.productTitle} » est déjà dans la commande avec une autre variante.`,
          })
        }
        return
      }

      addProductToOrder(product, variant)

      const stock = variant
        ? Number(variant.stock) || 0
        : Number((product as any)?.totalStock) || 0
      setReferenceStatus(
        stock > 0
          ? { type: 'success', message: `Ajouté : ${label}` }
          : { type: 'warning', message: `Ajouté : ${label} — attention, stock épuisé.` },
      )
    } finally {
      setIsSearchingReference(false)
      if (source === 'field') {
        setReferenceInput('')
        referenceInputRef.current?.focus()
      } else {
        setSearchTerm('')
        // La liste reste ouverte et focalisée pour enchaîner les saisies / scans.
        searchInputRef.current?.focus()
      }
    }
  }

  /**
   * Available stock for a line item.
   * - Variant selected → variant.stock
   * - Product has variants but none selected → totalStock (fallback)
   * - No variants → totalStock
   * Always returns a finite number >= 0 (never a fake high default).
   */
  const getAvailableStock = (item: ProductItem): number => {
    const product = products.find((p) => String(p.id) === String(item.id))
    if (!product) return 0

    const variants = getProductVariants(product)

    if (item.variantId) {
      const variant = variants.find(
        (v: any) => String(v?.id) === String(item.variantId),
      )
      if (variant && variant.stock != null && variant.stock !== '') {
        return Math.max(0, Number(variant.stock) || 0)
      }
      // Variant selected but stock missing on object → fall back to product totalStock
      return Math.max(0, Number((product as any)?.totalStock) || 0)
    }

    // If product has variants, prefer sum of variant stocks when available
    if (variants.length > 0) {
      const hasNumericStock = variants.some(
        (v: any) => v && typeof v === 'object' && v.stock != null && v.stock !== '',
      )
      if (hasNumericStock) {
        const sum = variants.reduce((acc: number, v: any) => {
          if (!v || typeof v !== 'object') return acc
          return acc + Math.max(0, Number(v.stock) || 0)
        }, 0)
        return sum
      }
    }

    return Math.max(0, Number((product as any)?.totalStock) || 0)
  }

  const updateProductQuantity = (productId: string, newQuantity: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((item) => {
        if (String(item.id) !== String(productId)) return item
        const maxStock = getAvailableStock(item)
        const raw = Math.floor(Number(newQuantity) || 1)
        // Always clamp to [1, maxStock] when stock is known (>= 0).
        // If maxStock is 0, keep quantity at 1 in UI but + stays disabled.
        const clamped =
          maxStock > 0
            ? Math.min(Math.max(1, raw), maxStock)
            : Math.max(1, Math.min(raw, 1))
        return { ...item, quantity: clamped }
      }),
    }))
    if (appliedPromoCode) {
      handleRemovePromoCode()
    }
  }

  const removeProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter(item => item.id !== productId)
    }))
    if (appliedPromoCode) {
      handleRemovePromoCode()
    }
  }

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return productId
    return product.productTitle 
  }

  const getProductDetails = (productId: string) => {
    const product = products.find(p => p.id === productId)
    return product || null
  }

  // Hide products already added to the order — dropdown is only for adding more
  const selectedProductIds = useMemo(
    () => new Set(formData.products.map((item) => String(item.id))),
    [formData.products],
  )

  const filteredProducts = products.filter((product: any) => {
    if (selectedProductIds.has(String(product.id))) return false
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    const name = (product.productTitle || '').toLowerCase()
    const reference = normalizeReference(term)
    return (
      name.includes(term) ||
      normalizeReference(product.barcode).includes(reference) ||
      getProductVariants(product).some(
        (v: any) =>
          normalizeReference(v?.sku).includes(reference) ||
          (Boolean(v?.reference) && normalizeReference(v.reference).includes(reference)),
      )
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setAlertMessage(null)
    setSuccess(false)

    // ——— Validation des champs obligatoires ———
    if (!formData.customerName.trim()) {
      showAlert('Le nom du client est requis.')
      setIsSubmitting(false)
      setCurrentStep('customer')
      return
    }

    if (!formData.customerPhone.trim()) {
      showAlert('Le numéro de téléphone est requis.')
      setIsSubmitting(false)
      setCurrentStep('customer')
      return
    }

    if (formData.products.length === 0) {
      showAlert('Veuillez sélectionner au moins un produit.')
      setIsSubmitting(false)
      setCurrentStep('products')
      return
    }

    // Quantités invalides
    for (const item of formData.products) {
      const qty = Number(item.quantity)
      if (!qty || qty < 1) {
        const product = products.find((p) => p.id === item.id)
        const label = item.variantName || product?.productTitle || item.id
        showAlert(`Quantité invalide pour « ${label} ».`)
        setIsSubmitting(false)
        setCurrentStep('products')
        return
      }
    }

    const validBirthDates = birthDates.filter(bd => bd.date.trim() !== '')

    try {
    const structuredItems = formData.products.map((item: ProductItem) => {
      const product = products?.find(p => p.id === item.id)
      const title = product?.productTitle || product?.id || item.id
      const price = product?.currentPrice || 0

      const unitPrice = item.price || price
      // Prix de référence de la fiche produit : seulement s'il est réellement
      // au-dessus du prix facturé.
      const oldPrice = Number((product as any)?.oldPrice) || 0

      return {
        productId: item.id,
        variantId: item.variantId || null,
        title,
        variantName: item.variantName || '',
        attributes: item.attributes || '',
        quantity: item.quantity || 1,
        price: unitPrice,
        oldPrice: oldPrice > unitPrice ? oldPrice : undefined,
        subtotal: unitPrice * item.quantity,
      }
    })

      // Ne envoyer que les champs définis dans la collection Orders
      const orderData: any = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail?.trim() || undefined,
        customerAddress: formData.customerAddress || undefined,
        customerGouvernorat: formData.customerGouvernorat || undefined,
        customerChildrenBirthDates:
          validBirthDates.length > 0
            ? validBirthDates.map((bd) => ({ date: bd.date }))
            : undefined,
        source: formData.source,
        note: formData.note || undefined,
        product: formData.products.map((item) => item.id),
        items: structuredItems.map(({ productId, variantId, title, attributes, quantity, price, oldPrice, subtotal: itemSubtotal }) => ({
          productId,
          variantId: variantId || undefined,
          title,
          attributes: attributes || undefined,
          quantity,
          price,
          oldPrice,
          subtotal: itemSubtotal,
        })),
        quantity: formData.products.reduce((sum, item) => sum + item.quantity, 0),
        deliveryFee,
        totalAmount: totalAmount,
        // Boutique = client a déjà acheté → statut validé par défaut (déduit le stock)
        status: formData.source === 'boutique' ? 'validated' : 'new',
      }

      if (appliedPromoCode) {
        orderData.promoCode = appliedPromoCode.promoCode
      }

      // ——— Contrôle stock côté client (toujours, message immédiat avant l'API) ———
      for (const item of formData.products) {
        const product = products.find((p) => p.id === item.id)
        const qty = Math.max(1, Number(item.quantity) || 1)
        let available = 0
        let label = product?.productTitle || item.id

        if (item.variantId) {
          const variants =
            (product as any)?.variants?.docs ||
            (Array.isArray((product as any)?.variants)
              ? (product as any).variants
              : [])
          const variant = variants.find(
            (v: any) => String(v.id) === String(item.variantId),
          )
          available = Number(variant?.stock) || 0
          label = item.variantName ? `${label} (${item.variantName})` : label
        } else {
          available = Number((product as any)?.totalStock) || 0
        }

        if (available < qty) {
          showAlert(
            `Stock insuffisant pour « ${label} ».\nDemandé : ${qty}, disponible : ${available}.`,
          )
          setIsSubmitting(false)
          setCurrentStep('products')
          return
        }
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        // usageCount is incremented server-side by Orders afterChange hook
        setSuccess(true)
        setFormData({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerAddress: '',
          customerGouvernorat: '',
          source: 'website',
          note: '',
          products: [],
          totalAmount: 0,
        })
        setBirthDates([{ id: '1', date: '', label: '' }])
        setOrderDiscount({ value: 0, type: 'amount' })
        setAppliedPromoCode(null)
        setPromoCodeInput('')
        setTimeout(() => {
          handleCloseModal()
          window.location.reload()
        }, 1500)
      } else {
        // Extraire le vrai message Payload (APIError, errors[], data, etc.)
        const extractMessage = (payload: any): string => {
          if (!payload) return ''
          if (typeof payload === 'string') return payload
          if (typeof payload.message === 'string' && payload.message !== 'Something went wrong.') {
            return payload.message
          }
          if (Array.isArray(payload.errors)) {
            for (const err of payload.errors) {
              const nested = extractMessage(err)
              if (nested && nested !== 'Something went wrong.') return nested
              if (typeof err?.data === 'string') return err.data
              if (Array.isArray(err?.data)) {
                for (const d of err.data) {
                  const m = extractMessage(d)
                  if (m) return m
                }
              }
            }
          }
          if (typeof payload.data === 'string') return payload.data
          return ''
        }

        const msg =
          extractMessage(data) ||
          'Erreur lors de la création de la commande (stock insuffisant ou données invalides).'
        showAlert(msg)
      }
    } catch (error) {
      console.error('Error creating order:', error)
      showAlert('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }
const getVariantLabel = (variant: any) => {
  if (!variant?.combination) return ''

  return variant.combination
    .map((c: any) => {
      if (typeof c === 'string') {
        const attrVal = attributeValues.find(v => v.id === c)
        return attrVal ? (attrVal.label || attrVal.value || attrVal.name || c) : c
      }

      return (
        c.label ||
        c.value ||
        c.name ||
        ''
      )
    })
    .filter(Boolean)
    .join(' - ')
}

const getVariantAttributes = (variant: any) =>
  (variant?.combination || [])
    .map((c: any) => {
      if (typeof c === 'string') {
        const attrVal = attributeValues.find(v => v.id === c)
        return attrVal ? (attrVal.label || attrVal.value || attrVal.name || c) : c
      }
      return c.label || c.value || c.name || ''
    })
    .join(', ')

  return (
    <>
      <Button
        buttonStyle="primary"
        size="medium"
        onClick={handleOpenModal}
      >
        <Plus size={18} style={{ marginRight: '6px' }} />
        Nouvelle commande
      </Button>

      {/* Custom Modal with Blur Background */}
      <div 
        className={`create-order-modal-overlay ${isModalOpen ? 'visible' : 'hidden'}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseModal()
          }
        }}
      >
        <div className="create-order-modal-content">
          {/* Modal Header */}
          <div className="create-order-modal-header">
            <div className="create-order-modal-header-left">
              <div className="create-order-modal-icon">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h2 className="create-order-modal-title">Nouvelle commande</h2>
                <p className="create-order-modal-subtitle">Remplissez les informations pour créer une commande</p>
              </div>
            </div>
            <button
              className="create-order-modal-close"
              onClick={handleCloseModal}
            >
              <X size={20} />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="create-order-steps">
            <button 
              className={`create-order-step ${currentStep === 'customer' ? 'active' : 'completed'}`}
              onClick={() => setCurrentStep('customer')}
            >
              <span className="create-order-step-number">
                {currentStep === 'products' ? <Check size={16} /> : '1'}
              </span>
              <span className="create-order-step-label">Client</span>
            </button>
            <div className="create-order-step-divider" />
            <button 
              className={`create-order-step ${currentStep === 'products' ? 'active' : ''}`}
              onClick={() => setCurrentStep('products')}
            >
              <span className="create-order-step-number">2</span>
              <span className="create-order-step-label">Produits</span>
            </button>
          </div>

          {success && (
            <div className="create-order-success">
              <Check size={20} />
              <span>Commande créée avec succès !</span>
            </div>
          )}

          {error && (
            <div className="create-order-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="create-order-form">
            {currentStep === 'customer' ? (
              /* Step 1: Customer Information */
              <div className="create-order-step-content">
                <div className="create-order-fields-grid">
                  {/* Customer Name */}
                  <div className="create-order-form-group">
                    <label className="create-order-label">
                      <User size={16} />
                      Nom complet <span className="create-order-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                      className="create-order-input"
                      placeholder="Ex: Ahmed Ben Ali"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Customer Phone */}
                  <div className="create-order-form-group">
                    <label className="create-order-label">
                      <Phone size={16} />
                      Téléphone <span className="create-order-required">*</span>
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleChange}
                      required
                      className="create-order-input"
                      placeholder="Ex: 22 123 456"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Customer Email */}
                  <div className="create-order-form-group">
                    <label className="create-order-label">
                      <Mail size={16} />
                      Email
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      className="create-order-input"
                      placeholder="Ex: client@email.com"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Customer Address */}
                  <div className="create-order-form-group">
                    <label className="create-order-label">
                      <MapPin size={16} />
                      Adresse
                    </label>
                    <input
                      type="text"
                      name="customerAddress"
                      value={formData.customerAddress}
                      onChange={handleChange}
                      className="create-order-input"
                      placeholder="Ex: 15 Rue de la Liberté"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Customer Governorate */}
                  <div className="create-order-form-group">
                    <label className="create-order-label">
                      <Globe size={16} />
                      Gouvernorat
                    </label>
                    <select
                      name="customerGouvernorat"
                      value={formData.customerGouvernorat}
                      onChange={handleChange}
                      className="create-order-select"
                      disabled={isSubmitting}
                    >
                      <option value="">Sélectionnez un gouvernorat</option>
                      {defaultGovernorats.map((gov) => (
                        <option key={gov} value={gov}>
                          {gov}
                        </option>
                      ))}
                    </select>
                  </div>
                                  {/* Source */}
                <div className="create-order-form-group">
                  <label className="create-order-label">
                    <Globe size={16} />
                    Source
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="create-order-select"
                    disabled={isSubmitting}
                  >
                    <option value="website">🌐 Site Web</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="facebook">📘 Facebook</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="boutique">🏪 Boutique</option>
                  </select>
                </div>
                </div>


                {/* Birth Dates Section */}
                  <div className="create-order-form-group">
                    <label className="create-order-label">
                      <Gift size={16} />
                      Dates de naissance
                    </label>
                    
                    <div className="create-order-birth-dates-container">
                      {birthDates.map((birthDate, index) => (
                        <div key={birthDate.id} className="create-order-birth-date-row">
                          <input
                            type="date"
                            value={birthDate.date}
                            onChange={(e) => handleBirthDateChange(birthDate.id, e.target.value)}
                            className="create-order-input"
                            disabled={isSubmitting}
                            max={new Date().toISOString().split('T')[0]}
                          />
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeBirthDate(birthDate.id)}
                              className="create-order-remove-birth-date-btn"
                              disabled={isSubmitting}
                              title="Supprimer cette date"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {birthDates.length < 2 && (
                      <button
                        type="button"
                        onClick={addBirthDate}
                        className="create-order-add-birth-date-btn"
                        disabled={isSubmitting}
                      >
                        <Plus size={14} />
                        Ajouter une date
                      </button>
                    )}
                  </div>



                {/* Note */}
                <div className="create-order-form-group">
                  <label className="create-order-label">
                    <MessageSquare size={16} />
                    Note
                  </label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    className="create-order-textarea"
                    placeholder="Ajoutez une note pour cette commande..."
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>

                {/* Navigation */}
                <div className="create-order-step-navigation">
                  <button 
                    type="button"
                    className="create-order-btn-cancel"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                  >
                    Annuler
                  </button>
                  <button 
                    type="button"
                    className="create-order-btn-next"
                    onClick={() => setCurrentStep('products')}
                  >
                    Étape suivante
                    <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Products & Order */
              <div className="create-order-step-content">
                <div className="create-order-products-layout">
                  <div className="create-order-products-main">
                    {/* Products - Custom Dropdown with Search */}
                    <div className="create-order-form-group" ref={dropdownRef}>
                      <label className="create-order-label">
                        <Package size={16} />
                        Produits <span className="create-order-required">*</span>
                      </label>

                      {/* Champ dédié référence / scan — toujours visible */}
                      <div className="create-order-reference-field">
                        <div className="create-order-reference-input-row">
                          <input
                            ref={referenceInputRef}
                            type="text"
                            className="create-order-reference-input"
                            placeholder="Référence produit (Entrée pour ajouter)"
                            value={referenceInput}
                            onChange={(e) => {
                              setReferenceInput(e.target.value)
                              setReferenceStatus(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddByReference('field')
                              }
                            }}
                            disabled={isSubmitting || isSearchingReference}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            className="create-order-reference-add-btn"
                            onClick={() => handleAddByReference('field')}
                            disabled={
                              isSubmitting ||
                              isSearchingReference ||
                              !referenceInput.trim()
                            }
                          >
                            {isSearchingReference ? '…' : 'Ajouter'}
                          </button>
                        </div>
                        {referenceStatus && !isProductDropdownOpen && (
                          <div
                            className={`create-order-reference-status ${referenceStatus.type}`}
                            role="status"
                          >
                            {referenceStatus.type === 'success' ? (
                              <Check size={14} />
                            ) : (
                              <AlertCircle size={14} />
                            )}
                            {referenceStatus.message}
                          </div>
                        )}
                      </div>
                      
                      {formData.products && formData.products.length > 0 ? (
                        <div className="create-order-selected-products">
                          {formData.products.map((item) => {
                            const product = getProductDetails(item.id)
                            const name = getProductName(item.id)
                            const price = item.price || product?.currentPrice || 0
                            const itemTotal = price * item.quantity
                            const availableStock = getAvailableStock(item)
                            const featuredImg =
                              product?.featuredImage &&
                              typeof product.featuredImage === 'object'
                                ? product.featuredImage
                                : null
                            const cardImageUrl =
                              featuredImg?.thumbnailURL ||
                              featuredImg?.url ||
                              (featuredImg?.sizes as any)?.thumbnail?.url ||
                              null
                            return (
                              <div key={item.id} className="create-order-product-card">
                                <div className="create-order-product-card-image">
                                  {cardImageUrl ? (
                                    <img
                                      src={cardImageUrl}
                                      alt={name || ''}
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Package size={22} strokeWidth={1.5} />
                                  )}
                                </div>
                                <div className="create-order-product-card-info">
                                  <div className="create-order-product-card-header">
                                    <span className="create-order-product-card-name">
                                      {name}
                                      {item.variantName && (
                                        <small className="create-order-variant-name">
                                          ({item.variantName})
                                        </small>
                                      )}
                                      {product?.barcode && (
                                        <small className="create-order-product-card-ref">
                                          Réf : {product.barcode}
                                        </small>
                                      )}
                                    </span>
                                    <div className="create-order-product-card-actions">
                                      <button
                                        type="button"
                                        className="create-order-product-preview"
                                        title="Ouvrir le produit"
                                        aria-label="Ouvrir le produit"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          window.open(
                                            `/admin/collections/products/${item.id}`,
                                            '_blank',
                                            'noopener,noreferrer'
                                          )
                                        }}
                                      >
                                        <ExternalLink size={16} strokeWidth={2} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeProduct(item.id)}
                                        className="create-order-product-card-remove"
                                        title="Retirer le produit"
                                        aria-label="Retirer le produit"
                                      >
                                        <Trash2 size={16} strokeWidth={2} />
                                      </button>
                                    </div>
                                  </div>
                                  {product?.variants?.docs && product.variants.docs.length > 0 && (
                                    <select
                                      className="create-order-variant-select"
                                      value={item.variantId || ''}
                                      required
                                      onChange={(e) => {
                                        const selectedVariant = product.variants?.docs?.find(
                                          (v): v is Variant =>
                                            typeof v !== 'string' && v.id === e.target.value
                                        )

                                        if (!selectedVariant) return

                                        const attributesString = getVariantAttributes(selectedVariant)

                                        const variantStock = Math.max(
                                          0,
                                          Number((selectedVariant as any)?.stock) || 0,
                                        )
                                        setFormData(prev => ({
                                          ...prev,
                                          products: prev.products.map(p =>
                                            p.id === item.id
                                              ? {
                                                  ...p,
                                                  variantId: selectedVariant.id,
                                                  price: selectedVariant.price,
                                                  variantName: getVariantLabel(selectedVariant),
                                                  attributes: attributesString,
                                                  // Cap quantity at variant stock (e.g. stock=1 → qty cannot exceed 1)
                                                  quantity:
                                                    variantStock > 0
                                                      ? Math.min(Math.max(1, p.quantity), variantStock)
                                                      : Math.max(1, p.quantity),
                                                }
                                              : p
                                          ),
                                        }))

                                        setIsProductDropdownOpen(false)
                                      }}
                                    >
                                      <option value="">
                                        Choisir une variante
                                      </option>
                                      {product.variants?.docs?.map((variant: any) => (
                                        <option key={variant.id} value={variant.id}>
                                          {getVariantLabel(variant)}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  <div className="create-order-product-card-details">
                                    <span className="create-order-product-card-price">
                                      {price.toFixed(2)} DT
                                    </span>
                                    <span className="create-order-product-card-multiply">×</span>
                                    <div
                                      className="create-order-qty-controls"
                                      title={
                                        availableStock > 0
                                          ? `Stock disponible : ${availableStock}`
                                          : undefined
                                      }
                                    >
                                      <button
                                        type="button"
                                        className="create-order-qty-btn"
                                        disabled={item.quantity <= 1 || isSubmitting}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          updateProductQuantity(item.id, item.quantity - 1)
                                        }}
                                        aria-label="Diminuer la quantité"
                                        title="Diminuer"
                                      >
                                        <span className="create-order-qty-symbol" aria-hidden="true">
                                          −
                                        </span>
                                      </button>
                                      <span className="create-order-qty-value">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        className="create-order-qty-btn"
                                        disabled={
                                          isSubmitting ||
                                          item.quantity >= Math.max(1, availableStock)
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          // Hard guard: never increase past stock
                                          if (item.quantity >= availableStock && availableStock >= 0) {
                                            return
                                          }
                                          updateProductQuantity(item.id, item.quantity + 1)
                                        }}
                                        aria-label="Augmenter la quantité"
                                        title={
                                          item.quantity >= availableStock && availableStock > 0
                                            ? `Stock max atteint (${availableStock})`
                                            : 'Augmenter'
                                        }
                                      >
                                        <span className="create-order-qty-symbol" aria-hidden="true">
                                          +
                                        </span>
                                      </button>
                                    </div>
                                    <span
                                      className={`create-order-stock-hint${
                                        availableStock <= 0
                                          ? ' out'
                                          : availableStock <= 5
                                            ? ' low'
                                            : ''
                                      }`}
                                    >
                                      Stock: {availableStock}
                                    </span>
                                    <span className="create-order-product-card-total">
                                      = {itemTotal.toFixed(2)} DT
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          <button
                            type="button"
                            ref={toggleRef}
                            className="create-order-add-product-btn"
                            onClick={openProductDropdown}
                          >
                            <Plus size={16} />
                            Ajouter un produit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          ref={toggleRef}
                          className="create-order-dropdown-toggle"
                          onClick={() => {
                            if (isProductDropdownOpen) {
                              setIsProductDropdownOpen(false)
                            } else {
                              openProductDropdown()
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          <span>Sélectionnez des produits...</span>
                          <ChevronDown size={16} className={`create-order-dropdown-arrow ${isProductDropdownOpen ? 'open' : ''}`} />
                        </button>
                      )}

                      {isProductDropdownOpen && (
                        <div 
                          className="create-order-dropdown-menu"
                          style={{
                            position: 'fixed',
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${dropdownPosition.width}px`,
                          }}
                        >
                          <div className="create-order-dropdown-search-wrapper">
                            <input
                              ref={searchInputRef}
                              type="text"
                              className="create-order-dropdown-search"
                              placeholder="Nom ou référence (Entrée pour ajouter)"
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setReferenceStatus(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddByReference('dropdown')
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoComplete="off"
                              autoFocus
                            />
                            {referenceStatus && (
                              <div className={`create-order-reference-status ${referenceStatus.type}`} role="status">
                                {referenceStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                {referenceStatus.message}
                              </div>
                            )}
                          </div>
                          <div className="create-order-dropdown-list">
                           <div className="create-order-dropdown-list">
                            {filteredProducts.length === 0 ? (
                              <div className="create-order-dropdown-empty">
                                <Package size={24} />
                                <span>
                                  {searchTerm.trim()
                                    ? 'Aucun produit trouvé'
                                    : 'Tous les produits sont déjà ajoutés'}
                                </span>
                              </div>
                            ) : (
                              filteredProducts.map((product) => {
                                const price = product.currentPrice || 0

                                const featuredImg =
                                  product.featuredImage &&
                                  typeof product.featuredImage === 'object'
                                    ? product.featuredImage
                                    : null
                                const imageUrl =
                                  featuredImg?.thumbnailURL ||
                                  featuredImg?.url ||
                                  (featuredImg?.sizes as any)?.thumbnail?.url ||
                                  null

                                return (
                                  <div
                                    key={product.id}
                                    className="create-order-dropdown-item"
                                    onClick={() => toggleProduct(product.id)}
                                  >
                                    <div className="create-order-dropdown-item-image">
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={product.productTitle || ''}
                                          loading="lazy"
                                        />
                                      ) : (
                                        <Package size={18} strokeWidth={1.5} />
                                      )}
                                    </div>

                                    <span className="create-order-dropdown-item-name">
                                      {product.productTitle || product.id}
                                      {product.barcode && (
                                        <small className="create-order-dropdown-item-ref">
                                          Réf : {product.barcode}
                                        </small>
                                      )}
                                    </span>

                                    {price > 0 && (
                                      <span className="create-order-dropdown-item-price">
                                        {price.toFixed(2)} DT
                                      </span>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Summary Sidebar */}
                  <div className="create-order-summary-sidebar">
                    <h3 className="create-order-summary-title">Résumé de la commande</h3>

                    {/* Promo Code — in summary, not above products */}
                    <div className="create-order-promo-section">
                      <label className="create-order-label">
                        <Tag size={16} />
                        Code promo
                      </label>

                      {!appliedPromoCode ? (
                        <div className="create-order-promo-input-wrapper">
                          <input
                            type="text"
                            value={promoCodeInput}
                            onChange={(e) => {
                              setPromoCodeInput(e.target.value.toUpperCase())
                              setPromoCodeError(null)
                            }}
                            className="create-order-input create-order-promo-input"
                            placeholder="Saisissez votre code"
                            disabled={isSubmitting || isValidatingPromo}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleApplyPromoCode()
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleApplyPromoCode}
                            className="create-order-promo-apply-btn"
                            disabled={isSubmitting || isValidatingPromo || !promoCodeInput.trim()}
                          >
                            {isValidatingPromo ? (
                              <>
                                <span className="create-order-spinner-small"></span>
                                Vérification...
                              </>
                            ) : (
                              'Appliquer'
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="create-order-promo-applied">
                          <div className="create-order-promo-applied-info">
                            <Sparkles size={16} />
                            <span className="create-order-promo-code-text">
                              {appliedPromoCode.promoCode}
                            </span>
                            <span className="create-order-promo-code-discount">
                              -{appliedPromoCode.discountType === 'percentage'
                                ? `${appliedPromoCode.discountValue}%`
                                : `${appliedPromoCode.discountValue} DT`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemovePromoCode}
                            className="create-order-promo-remove-btn"
                            disabled={isSubmitting}
                            title="Retirer le code promo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {promoCodeError && (
                        <div className="create-order-promo-error">
                          <AlertCircle size={14} />
                          {promoCodeError}
                        </div>
                      )}
                    </div>
                    
                    {/* Manual Discount */}
                    <div className="create-order-discount-section">
                      <div className="create-order-discount-header">
                        <label className="create-order-label" style={{ marginBottom: 0 }}>
                          <Percent size={16} />
                          Remise manuelle
                        </label>
                        <div className="create-order-discount-toggle-buttons">
                          <button
                            type="button"
                            className={`create-order-discount-toggle-btn ${orderDiscount.type === 'amount' ? 'active' : ''}`}
                            onClick={() => setOrderDiscount(prev => ({ ...prev, type: 'amount', value: 0 }))}
                          >
                            DT
                          </button>
                          <button
                            type="button"
                            className={`create-order-discount-toggle-btn ${orderDiscount.type === 'percent' ? 'active' : ''}`}
                            onClick={() => setOrderDiscount(prev => ({ ...prev, type: 'percent', value: 0 }))}
                          >
                            <Percent size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="create-order-discount-input-wrapper">
                        <input
                          type="number"
                          min="0"
                          step={orderDiscount.type === 'amount' ? '0.01' : '1'}
                          max={orderDiscount.type === 'percent' ? '100' : undefined}
                          value={orderDiscount.value || ''}
                          onChange={(e) => setOrderDiscount(prev => ({ 
                            ...prev, 
                            value: parseFloat(e.target.value) || 0 
                          }))}
                          className="create-order-input"
                          placeholder={orderDiscount.type === 'amount' ? '0.00' : '0'}
                        />
                        <span className="create-order-discount-input-unit">
                          {orderDiscount.type === 'amount' ? 'DT' : '%'}
                        </span>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="create-order-summary">
                      <div className="create-order-summary-row">
                        <span className="create-order-summary-label">Sous-total</span>
                        <span className="create-order-summary-value">{subtotal.toFixed(2)} DT</span>
                      </div>
                      
                      {promoDiscount > 0 && (
                        <div className="create-order-summary-row discount-row">
                          <span className="create-order-summary-label">
                            <Sparkles size={14} />
                            Code promo ({appliedPromoCode?.promoCode})
                          </span>
                          <span className="create-order-summary-value discount-value">
                            -{promoDiscount.toFixed(2)} DT
                          </span>
                        </div>
                      )}
                      
                      {orderDiscount.value > 0 && (
                        <div className="create-order-summary-row discount-row">
                          <span className="create-order-summary-label">
                            Remise manuelle
                          </span>
                          <span className="create-order-summary-value discount-value">
                            -{manualDiscount.toFixed(2)} DT
                          </span>
                        </div>
                      )}
                      
                      {deliveryFee > 0 && (
                        <div className="create-order-summary-row">
                          <span className="create-order-summary-label">Livraison</span>
                          <span className="create-order-summary-value">
                            {deliveryFee.toFixed(2)} DT
                          </span>
                        </div>
                      )}

                      <div className="create-order-summary-row total-row">
                        <span className="create-order-summary-label">Total</span>
                        <span className="create-order-summary-value total-value">
                          {totalAmount.toFixed(2)} DT
                        </span>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="create-order-step-navigation">
                      <button 
                        type="button"
                        className="create-order-btn-back"
                        onClick={() => setCurrentStep('customer')}
                        disabled={isSubmitting}
                      >
                        <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
                        Retour
                      </button>
                      <button 
                        type="submit"
                        className="create-order-btn-submit"
                        disabled={isSubmitting || success || formData.products.length === 0}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="create-order-spinner"></span>
                            Création...
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={18} />
                            Créer la commande
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Popup alert — missing fields / stock insufficient */}
      {alertMessage && (
        <div
          className="create-order-alert-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="create-order-alert-title"
          onClick={dismissAlert}
        >
          <div
            className="create-order-alert-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="create-order-alert-icon">
              <AlertCircle size={28} />
            </div>
            <h3 id="create-order-alert-title" className="create-order-alert-title">
              Attention
            </h3>
            <p className="create-order-alert-message">
              {alertMessage.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < alertMessage.split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
            <button
              type="button"
              className="create-order-alert-btn"
              onClick={dismissAlert}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default CreateOrderButton 