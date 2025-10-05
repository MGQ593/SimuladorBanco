import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-pages';

type Bindings = {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Servir archivos estáticos
app.use('/static/*', serveStatic());
app.use('/favicon.ico', serveStatic());

// Tipos para cálculos
interface CalculateRequest {
  monto: number;
  meses: number;
}

interface OpcionFinanciamiento {
  cuotaMensual: number;
  montoTotal: number;
  costoFinanciamiento: number;
  tasaAnual: number;
  nombre: string;
}

interface CalculateResponse {
  chevyPlan: OpcionFinanciamiento;
  bancario: OpcionFinanciamiento;
  diferenciaCuota: number;
  diferenciaCostoTotal: number;
  ahorroTotal: number;
  mejorOpcion: string;
  monto: number;
  meses: number;
}

// API para calcular comparación
app.post('/api/calculate', async (c) => {
  try {
    const body: CalculateRequest = await c.req.json();
    const { monto, meses } = body;

    // Validaciones
    if (!monto || !meses) {
      return c.json({ error: 'Monto y meses son requeridos' }, 400);
    }

    if (monto < 14000 || monto > 90000) {
      return c.json({ error: 'El monto debe estar entre $14,000 y $90,000' }, 400);
    }

    const plazosValidos = [24, 36, 48, 60, 72, 84];
    if (!plazosValidos.includes(meses)) {
      return c.json({ error: 'El plazo debe ser 24, 36, 48, 60, 72 o 84 meses' }, 400);
    }

    // Cálculo Chevy Plan (tasa flat 3.59%)
    const años = meses / 12;
    const interesFijoChevy = monto * 0.0359 * años;
    const montoTotalChevy = monto + interesFijoChevy;
    const cuotaMensualChevy = montoTotalChevy / meses;

    // Cálculo Bancario (16% anual, amortización francesa)
    const tasaMensualBancario = 0.16 / 12;
    const factorBancario = Math.pow(1 + tasaMensualBancario, meses);
    const cuotaMensualBancario = monto * (tasaMensualBancario * factorBancario) / (factorBancario - 1);
    const montoTotalBancario = cuotaMensualBancario * meses;

    const chevyPlan: OpcionFinanciamiento = {
      cuotaMensual: cuotaMensualChevy,
      montoTotal: montoTotalChevy,
      costoFinanciamiento: interesFijoChevy,
      tasaAnual: 3.59,
      nombre: 'Chevy Plan'
    };

    const bancario: OpcionFinanciamiento = {
      cuotaMensual: cuotaMensualBancario,
      montoTotal: montoTotalBancario,
      costoFinanciamiento: montoTotalBancario - monto,
      tasaAnual: 16,
      nombre: 'Crédito Bancario'
    };

    const diferenciaCuota = cuotaMensualBancario - cuotaMensualChevy;
    const diferenciaCostoTotal = bancario.costoFinanciamiento - chevyPlan.costoFinanciamiento;
    const ahorroTotal = montoTotalBancario - montoTotalChevy;
    const mejorOpcion = montoTotalChevy < montoTotalBancario ? 'chevyplan' : 'bancario';

    const response: CalculateResponse = {
      chevyPlan,
      bancario,
      diferenciaCuota,
      diferenciaCostoTotal,
      ahorroTotal,
      mejorOpcion,
      monto,
      meses
    };

    return c.json(response);
  } catch (error) {
    console.error('Error en cálculo:', error);
    return c.json({ error: 'Error al procesar el cálculo' }, 500);
  }
});

// Ruta principal
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador Chevy Plan - Compara tu Financiamiento</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .gold-gradient {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        }
        .card-hover {
            transition: all 0.3s ease;
        }
        .card-hover:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(255, 215, 0, 0.2);
        }
        .input-gold:focus {
            border-color: #FFD700;
            box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .pulse-gold {
            animation: pulseGold 2s infinite;
        }
        @keyframes pulseGold {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
            50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
        }
    </style>
</head>
<body class="min-h-screen py-8 px-4">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
        <div class="bg-black rounded-2xl p-6 shadow-2xl">
            <div class="flex items-center justify-between flex-wrap gap-4">
                <img src="https://www.chevyplan.com.ec/wp-content/uploads/2025/08/logo-chevyplan-25.webp" 
                     alt="Chevy Plan" 
                     class="h-12 md:h-16">
                <div class="text-right">
                    <h1 class="text-2xl md:text-3xl font-bold text-white">Simulador de Financiamiento</h1>
                    <p class="text-gray-400 mt-1">Compara y ahorra con Chevy Plan</p>
                </div>
            </div>
        </div>
    </div>

    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Formulario -->
        <div class="lg:col-span-1">
            <div class="bg-black rounded-2xl p-6 shadow-2xl card-hover">
                <div class="gold-gradient rounded-xl p-4 mb-6">
                    <h2 class="text-2xl font-bold text-black flex items-center gap-2">
                        <i class="fas fa-calculator"></i>
                        Datos del Financiamiento
                    </h2>
                </div>

                <form id="calculatorForm" class="space-y-6">
                    <div>
                        <label class="block text-gray-300 font-semibold mb-2">
                            <i class="fas fa-dollar-sign mr-2"></i>Monto a Financiar
                        </label>
                        <input type="number" 
                               id="monto" 
                               min="14000" 
                               max="90000" 
                               step="1000"
                               value="50000"
                               class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white text-xl font-bold focus:outline-none input-gold">
                        <div class="flex justify-between mt-2 text-sm text-gray-400">
                            <span>$14,000</span>
                            <span>$90,000</span>
                        </div>
                        <input type="range" 
                               id="montoRange" 
                               min="14000" 
                               max="90000" 
                               step="1000"
                               value="50000"
                               class="w-full mt-2">
                    </div>

                    <div>
                        <label class="block text-gray-300 font-semibold mb-2">
                            <i class="fas fa-calendar-alt mr-2"></i>Plazo en Meses
                        </label>
                        <select id="meses" 
                                class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white text-xl font-bold focus:outline-none input-gold">
                            <option value="24">24 meses (2 años)</option>
                            <option value="36">36 meses (3 años)</option>
                            <option value="48">48 meses (4 años)</option>
                            <option value="60" selected>60 meses (5 años)</option>
                            <option value="72">72 meses (6 años)</option>
                            <option value="84">84 meses (7 años)</option>
                        </select>
                    </div>

                    <button type="submit" 
                            class="w-full gold-gradient text-black font-bold py-4 px-6 rounded-lg text-lg hover:opacity-90 transition-all pulse-gold flex items-center justify-center gap-2">
                        <i class="fas fa-chart-line"></i>
                        CALCULAR FINANCIAMIENTO
                    </button>
                </form>

                <div class="mt-6 p-4 bg-gray-800 rounded-lg">
                    <h3 class="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                        <i class="fas fa-info-circle"></i>
                        Información Importante
                    </h3>
                    <ul class="text-gray-300 text-sm space-y-1">
                        <li>• Tasa Chevy Plan: <strong>3.59% anual fija</strong></li>
                        <li>• Tasa Bancaria: <strong>16% anual</strong></li>
                        <li>• Simulación referencial</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Resultados -->
        <div class="lg:col-span-2 space-y-6" id="resultados" style="display: none;">
            <!-- Resumen de Ahorro -->
            <div class="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 shadow-2xl animate-fade-in">
                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p class="text-green-100 text-sm uppercase tracking-wide">Tu Ahorro con Chevy Plan</p>
                        <p class="text-4xl md:text-5xl font-bold text-white mt-2" id="ahorroTotal">$0</p>
                        <p class="text-green-100 mt-1" id="ahorroDetalle"></p>
                    </div>
                    <div class="bg-white/20 rounded-full p-4">
                        <i class="fas fa-piggy-bank text-5xl text-white"></i>
                    </div>
                </div>
            </div>

            <!-- Comparación de Opciones -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Chevy Plan -->
                <div class="bg-black rounded-2xl p-6 shadow-2xl border-2 border-yellow-500 card-hover animate-fade-in">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-2xl font-bold text-yellow-400">
                            <i class="fas fa-star mr-2"></i>Chevy Plan
                        </h3>
                        <span class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                            RECOMENDADO
                        </span>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-gray-900 rounded-lg p-4">
                            <p class="text-gray-400 text-sm">Cuota Mensual</p>
                            <p class="text-3xl font-bold text-yellow-400" id="cuotaChevy">$0</p>
                        </div>
                        
                        <div class="space-y-2 text-gray-300">
                            <div class="flex justify-between">
                                <span>Monto Financiado:</span>
                                <strong id="montoChevy">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Intereses:</span>
                                <strong class="text-green-400" id="interesChevy">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Total a Pagar:</span>
                                <strong class="text-yellow-400" id="totalChevy">$0</strong>
                            </div>
                            <div class="flex justify-between pt-2 border-t border-gray-700">
                                <span>Tasa:</span>
                                <strong>3.59% anual</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Crédito Bancario -->
                <div class="bg-black rounded-2xl p-6 shadow-2xl border-2 border-red-500 card-hover animate-fade-in">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-2xl font-bold text-red-400">
                            <i class="fas fa-university mr-2"></i>Crédito Bancario
                        </h3>
                        <span class="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                            MÁS CARO
                        </span>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-gray-900 rounded-lg p-4">
                            <p class="text-gray-400 text-sm">Cuota Mensual</p>
                            <p class="text-3xl font-bold text-red-400" id="cuotaBancario">$0</p>
                        </div>
                        
                        <div class="space-y-2 text-gray-300">
                            <div class="flex justify-between">
                                <span>Monto Financiado:</span>
                                <strong id="montoBancario">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Intereses:</span>
                                <strong class="text-red-400" id="interesBancario">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Total a Pagar:</span>
                                <strong class="text-red-400" id="totalBancario">$0</strong>
                            </div>
                            <div class="flex justify-between pt-2 border-t border-gray-700">
                                <span>Tasa:</span>
                                <strong>16% anual</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráfico Comparativo -->
            <div class="bg-black rounded-2xl p-6 shadow-2xl animate-fade-in">
                <h3 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-chart-bar"></i>
                    Comparación Visual
                </h3>
                <canvas id="comparisonChart" height="100"></canvas>
            </div>

            <!-- Botón de WhatsApp -->
            <div class="bg-black rounded-2xl p-6 shadow-2xl text-center animate-fade-in">
                <h3 class="text-2xl font-bold text-white mb-4">¿Listo para tu Chevy Plan?</h3>
                <a href="https://wa.me/593981813395" 
                   target="_blank"
                   class="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all">
                    <i class="fab fa-whatsapp text-2xl"></i>
                    Consultar por WhatsApp
                </a>
                <p class="text-gray-400 mt-4 text-sm">098 1813 395</p>
            </div>
        </div>
    </div>

    <script>
        let chart = null;

        function formatCurrency(amount) {
            return new Intl.NumberFormat('es-EC', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(amount);
        }

        // Sincronizar input numérico con range
        const montoInput = document.getElementById('monto');
        const montoRange = document.getElementById('montoRange');
        
        montoInput.addEventListener('input', (e) => {
            montoRange.value = e.target.value;
        });
        
        montoRange.addEventListener('input', (e) => {
            montoInput.value = e.target.value;
        });

        document.getElementById('calculatorForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const monto = parseFloat(document.getElementById('monto').value);
            const meses = parseInt(document.getElementById('meses').value);

            try {
                const response = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ monto, meses })
                });

                if (!response.ok) {
                    const error = await response.json();
                    alert(error.error || 'Error al calcular');
                    return;
                }

                const data = await response.json();
                displayResults(data);
            } catch (error) {
                console.error('Error:', error);
                alert('Error al conectar con el servidor');
            }
        });

        function displayResults(data) {
            // Mostrar sección de resultados
            document.getElementById('resultados').style.display = 'block';
            document.getElementById('resultados').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Ahorro
            document.getElementById('ahorroTotal').textContent = formatCurrency(data.ahorroTotal);
            document.getElementById('ahorroDetalle').textContent = 
                \`Ahorras \${formatCurrency(data.diferenciaCuota)} mensuales\`;

            // Chevy Plan
            document.getElementById('cuotaChevy').textContent = formatCurrency(data.chevyPlan.cuotaMensual);
            document.getElementById('montoChevy').textContent = formatCurrency(data.monto);
            document.getElementById('interesChevy').textContent = formatCurrency(data.chevyPlan.costoFinanciamiento);
            document.getElementById('totalChevy').textContent = formatCurrency(data.chevyPlan.montoTotal);

            // Bancario
            document.getElementById('cuotaBancario').textContent = formatCurrency(data.bancario.cuotaMensual);
            document.getElementById('montoBancario').textContent = formatCurrency(data.monto);
            document.getElementById('interesBancario').textContent = formatCurrency(data.bancario.costoFinanciamiento);
            document.getElementById('totalBancario').textContent = formatCurrency(data.bancario.montoTotal);

            // Gráfico
            updateChart(data);
        }

        function updateChart(data) {
            const ctx = document.getElementById('comparisonChart').getContext('2d');

            if (chart) {
                chart.destroy();
            }

            chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Cuota Mensual', 'Costo de Intereses', 'Total a Pagar'],
                    datasets: [
                        {
                            label: 'Chevy Plan',
                            data: [
                                data.chevyPlan.cuotaMensual,
                                data.chevyPlan.costoFinanciamiento,
                                data.chevyPlan.montoTotal
                            ],
                            backgroundColor: 'rgba(255, 215, 0, 0.8)',
                            borderColor: 'rgba(255, 215, 0, 1)',
                            borderWidth: 2
                        },
                        {
                            label: 'Crédito Bancario',
                            data: [
                                data.bancario.cuotaMensual,
                                data.bancario.costoFinanciamiento,
                                data.bancario.montoTotal
                            ],
                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                            borderColor: 'rgba(239, 68, 68, 1)',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#fff',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#fff',
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#fff',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Calcular automáticamente al cargar
        window.addEventListener('load', () => {
            document.getElementById('calculatorForm').dispatchEvent(new Event('submit'));
        });
    </script>
</body>
</html>`;
  
  return c.html(html);
});

// Ruta de healthcheck
app.get('/health', (c) => {
    return c.text('ok', 200);
});

export default app;