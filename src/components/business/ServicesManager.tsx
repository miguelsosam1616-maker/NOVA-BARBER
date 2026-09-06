import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Business, Service } from '../../types';
import { useNovaDb } from '../../lib/store';
import { formatRD } from '../../lib/utils';

interface ServicesManagerProps {
  business: Business;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({ business }) => {
  const { db } = useNovaDb();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState<'cortes' | 'barba' | 'combos' | 'faciales' | 'color' | 'otros'>('cortes');
  const [imageUrl, setImageUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sample curated barber images for quick 1-click selection if owner desires
  const sampleStyleImages = [
    { label: 'Degradado Fade', url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80' },
    { label: 'Barba Navaja', url: 'https://images.unsplash.com/photo-1517832606589-7629c3395909?w=600&auto=format&fit=crop&q=80' },
    { label: 'Combo Completo', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80' },
    { label: 'Black Mask Facial', url: 'https://images.unsplash.com/photo-1512290900672-1f486438787c?w=600&auto=format&fit=crop&q=80' },
    { label: 'Colorimetría', url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=600&auto=format&fit=crop&q=80' },
  ];

  const handleOpenCreate = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setPrice('');
    setDuration('30');
    setCategory('cortes');
    setImageUrl('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description);
    setPrice(String(service.price));
    setDuration(String(service.duration));
    setCategory(service.category);
    setImageUrl(service.image || '');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleToggleActive = (serviceId: string) => {
    const updated = business.services.map((s) =>
      s.id === serviceId ? { ...s, active: !s.active } : s
    );
    db.updateBusinessServices(business.id, updated);
  };

  const handleDeleteService = (serviceId: string) => {
    if (confirm('¿Seguro que deseas eliminar este servicio?')) {
      const updated = business.services.filter((s) => s.id !== serviceId);
      db.updateBusinessServices(business.id, updated);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor introduce el nombre del servicio.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('Por favor introduce un precio válido en RD$.');
      return;
    }
    const numDuration = parseInt(duration, 10);
    if (isNaN(numDuration) || numDuration <= 0) {
      setErrorMsg('Por favor introduce una duración estimada en minutos.');
      return;
    }

    let updatedServices: Service[] = [];

    if (editingService) {
      // Edit existing
      updatedServices = business.services.map((s) => {
        if (s.id === editingService.id) {
          return {
            ...s,
            name: name.trim(),
            description: description.trim(),
            price: numPrice,
            duration: numDuration,
            category,
            image: imageUrl.trim() || undefined,
          };
        }
        return s;
      });
    } else {
      // Create new
      const newService: Service = {
        id: `srv-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        price: numPrice,
        duration: numDuration,
        category,
        image: imageUrl.trim() || undefined,
        active: true,
      };
      updatedServices = [...business.services, newService];
    }

    db.updateBusinessServices(business.id, updatedServices);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Scissors className="w-6 h-6 text-amber-400" />
            Servicios y Precios Personalizados (RD$)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Crea con libertad total cualquier corte, barba o tratamiento. Las imágenes son opcionales.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {/* Services List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {business.services.map((srv) => (
          <div
            key={srv.id}
            className={`bg-zinc-900 border rounded-2xl p-4 sm:p-5 shadow-xl transition-all flex flex-col justify-between ${
              srv.active
                ? 'border-zinc-800 hover:border-zinc-700'
                : 'border-zinc-800/40 opacity-60 bg-zinc-950'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Image Preview if provided, or clean icon placeholder */}
              {srv.image ? (
                <img
                  src={srv.image}
                  alt={srv.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-zinc-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-zinc-800/80 border border-zinc-700 flex flex-col items-center justify-center text-amber-400 shrink-0 text-center p-2">
                  <Scissors className="w-6 h-6 mb-1" />
                  <span className="text-[9px] text-zinc-400 leading-tight">Sin imagen</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-zinc-100 leading-tight">{srv.name}</h3>
                  <span className="text-base font-black text-amber-400 shrink-0">
                    {formatRD(srv.price)}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {srv.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">
                    ⏱️ {srv.duration} mins
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 capitalize">
                    {srv.category}
                  </span>
                  {srv.active ? (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Activo
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-500 font-semibold">Inactivo</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <button
                onClick={() => handleToggleActive(srv.id)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {srv.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{srv.active ? 'Desactivar' : 'Activar'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(srv)}
                  className="p-1.5 text-zinc-400 hover:text-amber-400 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Editar Servicio"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteService(srv.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Eliminar Servicio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Service */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-amber-400" />
                {editingService ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Corte Clásico Degradado (Fade), Barba y Toalla Caliente..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalla qué incluye el corte o tratamiento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Precio en RD$ *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Duración Estimada (mins) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 30"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-400"
                >
                  <option value="cortes">Cortes de Pelo / Fade</option>
                  <option value="barba">Diseño y Afeitado de Barba</option>
                  <option value="combos">Combos Especiales (Corte + Barba)</option>
                  <option value="faciales">Tratamientos Faciales y Mascarillas</option>
                  <option value="color">Colorimetría y Tintes</option>
                  <option value="otros">Otros Servicios</option>
                </select>
              </div>

              {/* Optional Image Section as emphasized by user */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    Imagen del Servicio (Opcional)
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    No obligatoria
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="URL de la imagen (o déjalo vacío si no deseas foto)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                  />

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 cursor-pointer border border-zinc-700">
                      <span>📷 Subir archivo de imagen</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>

                  {/* Suggestion presets */}
                  <div className="pt-1">
                    <span className="text-[10px] text-zinc-500 block mb-1">
                      O elige una foto sugerida:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sampleStyleImages.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setImageUrl(s.url)}
                          className="text-[10px] px-2 py-1 rounded-md bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 border border-zinc-700"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image preview */}
                  {imageUrl && (
                    <div className="pt-1 flex items-center gap-3 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
                      <img
                        src={imageUrl}
                        alt="Vista previa"
                        className="w-12 h-12 rounded-lg object-cover border border-zinc-700"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-xs text-emerald-400 font-medium">
                        Vista previa cargada correctamente
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {editingService ? 'Actualizar Servicio' : 'Guardar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
