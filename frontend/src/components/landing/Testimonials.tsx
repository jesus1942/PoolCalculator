import React from 'react';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
  text: string;
}

export const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Carlos Rodríguez",
      role: "Instalador Profesional",
      company: "Piscinas del Sur",
      avatar: "https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=3B82F6&color=fff&size=128",
      rating: 5,
      text: "Pool Installer revolucionó mi forma de trabajar. Lo que antes me llevaba horas de cálculos, ahora lo resuelvo en minutos. Los presupuestos son precisos y profesionales."
    },
    {
      id: 2,
      name: "María González",
      role: "Propietaria",
      company: "Construcciones González",
      avatar: "https://ui-avatars.com/api/?name=Maria+Gonzalez&background=06B6D4&color=fff&size=128",
      rating: 5,
      text: "Increíble herramienta para gestionar múltiples proyectos simultáneamente. El catálogo de modelos ACQUAM es completo y actualizado. Muy recomendable."
    },
    {
      id: 3,
      name: "Roberto Fernández",
      role: "Arquitecto",
      company: "Estudio Fernández",
      avatar: "https://ui-avatars.com/api/?name=Roberto+Fernandez&background=8B5CF6&color=fff&size=128",
      rating: 5,
      text: "La integración con Excel y la capacidad de exportar reportes detallados es exactamente lo que necesitaba. Ahorro más del 60% del tiempo en presupuestación."
    },
    {
      id: 4,
      name: "Laura Martínez",
      role: "Ingeniera Civil",
      company: "Obras Martínez",
      avatar: "https://ui-avatars.com/api/?name=Laura+Martinez&background=EC4899&color=fff&size=128",
      rating: 5,
      text: "La precisión de los cálculos es impresionante. Los errores de presupuesto se redujeron a cero. El portal del cliente es un diferencial enorme."
    },
    {
      id: 5,
      name: "Diego Sánchez",
      role: "Constructor",
      company: "Piscinas Premium",
      avatar: "https://ui-avatars.com/api/?name=Diego+Sanchez&background=F59E0B&color=fff&size=128",
      rating: 5,
      text: "Excelente soporte técnico y actualizaciones constantes. La base de datos de precios 2025 me mantiene competitivo. Una inversión que se paga sola."
    },
    {
      id: 6,
      name: "Patricia López",
      role: "Gerente de Proyectos",
      company: "Aqua Construcciones",
      avatar: "https://ui-avatars.com/api/?name=Patricia+Lopez&background=10B981&color=fff&size=128",
      rating: 5,
      text: "La automatización de cálculos complejos como excavación e hidráulica es fantástica. Puedo gestionar más proyectos con el mismo equipo."
    }
  ];

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`w-5 h-5 ${
              index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {testimonials.map((testimonial, index) => (
        <div
          key={testimonial.id}
          className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative"
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          {/* Quote Icon */}
          <div className="absolute top-4 right-4 text-blue-100">
            <Quote className="w-12 h-12" />
          </div>

          {/* Avatar and Info */}
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              className="w-16 h-16 rounded-full border-4 border-blue-100"
            />
            <div>
              <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
              <p className="text-sm text-gray-600">{testimonial.role}</p>
              <p className="text-xs text-gray-500">{testimonial.company}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-4">
            {renderStars(testimonial.rating)}
          </div>

          {/* Testimonial Text */}
          <p className="text-gray-700 leading-relaxed italic">
            "{testimonial.text}"
          </p>
        </div>
      ))}
    </div>
  );
};
