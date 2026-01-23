import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Waves, Calculator, DollarSign, FileText, Users, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <Calculator className="w-8 h-8" />,
      title: "Cálculos Precisos",
      description: "Calcula materiales exactos para cada proyecto de piscina con precisión profesional"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Gestión de Costos",
      description: "Control total de presupuestos, materiales y mano de obra en tiempo real"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Reportes Detallados",
      description: "Genera presupuestos profesionales y reportes completos para tus clientes"
    },
    {
      icon: <Waves className="w-8 h-8" />,
      title: "Catálogo de Modelos",
      description: "24 modelos de piscinas ACQUAM con especificaciones técnicas completas"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Portal del Cliente",
      description: "Tus clientes pueden ver el progreso de su proyecto en tiempo real"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Automatización",
      description: "Automatiza cálculos complejos de excavación, hidráulica y electricidad"
    }
  ];

  const benefits = [
    "Ahorra hasta 60% del tiempo en presupuestación",
    "Reduce errores de cálculo a cero",
    "Gestiona múltiples proyectos simultáneamente",
    "Exporta a Excel con un click",
    "Base de datos actualizada de precios 2025",
    "Soporte técnico profesional"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header/Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <img src={publicAssetUrl('logo.png')} alt="Domotics & IoT Solutions" className="h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pool Installer</h1>
                <p className="text-sm text-gray-600">by Domotics & IoT Solutions</p>
              </div>
            </div>
            <div className="flex gap-4">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  Ir al Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-2 text-gray-700 font-medium hover:text-blue-600 transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Registrarse
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6">
              <Waves className="w-5 h-5" />
              <span className="font-semibold">Sistema Profesional de Cálculo</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Calcula Materiales para<br />
              <span className="text-blue-600">Piscinas de Fibra</span> en Minutos
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Sistema completo para calcular materiales, presupuestar y gestionar proyectos
              de montaje de piscinas de fibra de vidrio con precisión profesional.
            </p>
            <div className="flex gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    Ir al Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate('/projects')}
                    className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-md border-2 border-gray-200"
                  >
                    Ver Proyectos
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    Comenzar Gratis
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-md border-2 border-gray-200"
                  >
                    Iniciar Sesión
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">24</div>
              <div className="text-gray-600">Modelos ACQUAM</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">60%</div>
              <div className="text-gray-600">Ahorro de Tiempo</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">100+</div>
              <div className="text-gray-600">Materiales</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">2025</div>
              <div className="text-gray-600">Precios Actualizados</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitás en una plataforma
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Diseñado específicamente para instaladores profesionales de piscinas
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Por qué elegir Pool Installer
              </h3>
              <p className="text-xl text-blue-100 mb-8">
                Desarrollado por profesionales de la industria para profesionales de la industria
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h4 className="text-2xl font-bold mb-4">
                {isAuthenticated ? 'Bienvenido de Nuevo' : 'Comienza Hoy'}
              </h4>
              <p className="text-blue-100 mb-6">
                {isAuthenticated
                  ? 'Accede a tu panel de control y gestiona tus proyectos'
                  : 'Únete a los instaladores profesionales que ya confían en Pool Installer'
                }
              </p>
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="w-full px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-blue-50 transition-all shadow-lg"
              >
                {isAuthenticated ? 'Ir al Dashboard' : 'Crear Cuenta Gratis'}
              </button>
              {!isAuthenticated && (
                <p className="text-sm text-blue-200 mt-4 text-center">
                  No requiere tarjeta de crédito
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img src={publicAssetUrl('logo.png')} alt="Domotics & IoT Solutions" className="h-10 w-auto opacity-80" />
              <div>
                <p className="text-white font-semibold">Pool Installer</p>
                <p className="text-sm">Sistema completo de cálculo de materiales</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-white font-semibold mb-1">Desarrollado por</p>
              <p className="text-sm">Jesús Olguín - Domotics & IoT Solutions</p>
              <p className="text-sm">Professional Developer</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2025 Pool Installer. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
