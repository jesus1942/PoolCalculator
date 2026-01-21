import React from 'react';
import { Check, Zap, Rocket, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  highlighted: boolean;
  ctaText: string;
  badge?: string;
}

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();

  const plans: PricingPlan[] = [
    {
      name: "Básico",
      price: "Gratis",
      period: "por siempre",
      description: "Perfecto para comenzar y probar la plataforma",
      icon: <Zap className="w-8 h-8" />,
      features: [
        "5 proyectos por mes",
        "Catálogo completo de 24 modelos ACQUAM",
        "Cálculos básicos de materiales",
        "Exportación a Excel",
        "Soporte por email",
      ],
      highlighted: false,
      ctaText: "Comenzar Gratis"
    },
    {
      name: "Profesional",
      price: "$19.900",
      period: "/mes",
      description: "Para instaladores profesionales",
      icon: <Rocket className="w-8 h-8" />,
      features: [
        "Proyectos ilimitados",
        "Todos los modelos ACQUAM",
        "Cálculos avanzados (excavación, hidráulica)",
        "Exportación a Excel y PDF",
        "Portal del cliente",
        "Precios actualizados 2025",
        "Gestión de múltiples clientes",
        "Soporte prioritario",
      ],
      highlighted: true,
      ctaText: "Iniciar Prueba Gratuita",
      badge: "Más Popular"
    },
    {
      name: "Empresarial",
      price: "Personalizado",
      period: "",
      description: "Para empresas con alto volumen",
      icon: <Crown className="w-8 h-8" />,
      features: [
        "Todo lo de Profesional, más:",
        "Usuarios ilimitados",
        "API de integración",
        "Marca personalizada (white-label)",
        "Modelos personalizados",
        "Base de datos propia",
        "Capacitación del equipo",
        "Soporte dedicado 24/7",
        "SLA garantizado",
      ],
      highlighted: false,
      ctaText: "Contactar Ventas"
    }
  ];

  const handleCTAClick = (plan: PricingPlan) => {
    if (plan.name === "Empresarial") {
      // Scroll to contact form
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Navigate to register
      navigate('/register');
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {plans.map((plan, index) => (
        <div
          key={plan.name}
          className={`relative rounded-2xl p-8 transition-all duration-500 transform hover:-translate-y-2 ${
            plan.highlighted
              ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-2xl scale-105 md:scale-110'
              : 'bg-white text-gray-900 shadow-lg hover:shadow-xl'
          }`}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          {/* Badge */}
          {plan.badge && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                {plan.badge}
              </span>
            </div>
          )}

          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-6 ${
            plan.highlighted ? 'bg-white/20' : 'bg-blue-100 text-blue-600'
          }`}>
            {plan.icon}
          </div>

          {/* Plan Name */}
          <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

          {/* Description */}
          <p className={`text-sm mb-6 ${
            plan.highlighted ? 'text-blue-100' : 'text-gray-600'
          }`}>
            {plan.description}
          </p>

          {/* Price */}
          <div className="mb-8">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.period && (
                <span className={`text-sm ${
                  plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                }`}>
                  {plan.period}
                </span>
              )}
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  plan.highlighted ? 'text-green-300' : 'text-green-500'
                }`} />
                <span className={`text-sm ${
                  plan.highlighted ? 'text-blue-50' : 'text-gray-700'
                }`}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <button
            onClick={() => handleCTAClick(plan)}
            className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
              plan.highlighted
                ? 'bg-white text-blue-600 hover:bg-blue-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {plan.ctaText}
          </button>

          {/* Trial Info */}
          {plan.name === "Profesional" && (
            <p className="text-center text-xs mt-4 opacity-80">
              14 días de prueba gratis • Sin tarjeta de crédito
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
