import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-pages';

type Bindings = {
  ASSETS: any;
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
      nombre: 'ChevyPlan'
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
    <title>Simulador ChevyPlan - Compara tu Financiamiento</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .corporate-accent {
            background: #c8a45e;
        }
        .card-shadow {
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            transition: box-shadow 0.3s ease;
        }
        .card-shadow:hover {
            box-shadow: 0 4px 10px rgba(0,0,0,0.12);
        }
        .input-focus:focus {
            border-color: #c8a45e;
            outline: none;
            box-shadow: 0 0 0 3px rgba(200, 164, 94, 0.1);
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .result-number {
            font-size: 1.25rem;
            font-weight: 600;
        }
        @media (min-width: 768px) {
            .result-number {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body class="min-h-screen py-4 px-3">
    <!-- Header Negro -->
    <div class="max-w-6xl mx-auto mb-4">
        <div class="bg-black rounded-lg p-3 md:p-4 card-shadow">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <img src="https://www.chevyplan.com.ec/wp-content/uploads/2025/08/logo-chevyplan-25.webp" 
                     alt="ChevyPlan" 
                     class="h-8 md:h-10">
                <div class="text-right">
                    <h1 class="text-base md:text-lg font-semibold text-white">Simulador de Financiamiento</h1>
                    <p class="text-xs text-gray-400 mt-0.5">Compara y ahorra con ChevyPlan</p>
                </div>
            </div>
        </div>
    </div>

    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <!-- Formulario + Info + WhatsApp (desktop) -->
        <div class="lg:col-span-1 space-y-3">
            <!-- Formulario -->
            <div class="bg-white rounded-lg p-3 md:p-4 card-shadow">
                <div class="corporate-accent rounded-lg p-2.5 mb-3">
                    <h2 class="text-base font-semibold text-white flex items-center gap-2">
                        <i class="fas fa-calculator text-sm"></i>
                        Datos del Financiamiento
                    </h2>
                </div>

                <form id="calculatorForm" class="space-y-3">
                    <div>
                        <label class="block text-gray-700 font-medium mb-1.5 text-sm">
                            <i class="fas fa-dollar-sign mr-1 text-xs"></i>Monto a Financiar
                        </label>
                        <input type="number" 
                               id="monto" 
                               min="14000" 
                               max="90000" 
                               step="1000"
                               value="50000"
                               class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 text-base font-semibold focus:outline-none input-focus">
                        <div class="flex justify-between mt-1 text-xs text-gray-500">
                            <span>$14,000</span>
                            <span>$90,000</span>
                        </div>
                        <input type="range" 
                               id="montoRange" 
                               min="14000" 
                               max="90000" 
                               step="1000"
                               value="50000"
                               class="w-full mt-1">
                    </div>

                    <div>
                        <label class="block text-gray-700 font-medium mb-1.5 text-sm">
                            <i class="fas fa-calendar-alt mr-1 text-xs"></i>Plazo en Meses
                        </label>
                        <select id="meses" 
                                class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 text-base font-semibold focus:outline-none input-focus">
                            <option value="24">24 meses (2 años)</option>
                            <option value="36">36 meses (3 años)</option>
                            <option value="48">48 meses (4 años)</option>
                            <option value="60" selected>60 meses (5 años)</option>
                            <option value="72">72 meses (6 años)</option>
                            <option value="84">84 meses (7 años)</option>
                        </select>
                    </div>

                    <button type="submit" 
                            class="w-full corporate-accent text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <i class="fas fa-chart-line text-sm"></i>
                        Calcular Financiamiento
                    </button>
                </form>

                <!-- Información Importante -->
                <div class="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <h3 class="text-gray-700 font-semibold mb-1.5 text-sm">Información Importante</h3>
                    <ul class="text-gray-600 text-xs space-y-0.5">
                        <li>• Tasa ChevyPlan: <strong>3.59% anual fija</strong></li>
                        <li>• Tasa Bancaria: <strong>16% anual</strong></li>
                        <li>• Simulación referencial</li>
                    </ul>
                </div>
            </div>

            <!-- Botón de WhatsApp (solo visible en desktop) -->
            <div class="hidden lg:block bg-white rounded-lg p-3 md:p-4 card-shadow text-center">
                <h3 class="text-sm font-semibold text-gray-800 mb-2">¿Listo para tu ChevyPlan?</h3>
                <a href="https://wa.me/593981813395" 
                   target="_blank"
                   class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-5 rounded-md text-sm transition-all w-full justify-center">
                    <i class="fab fa-whatsapp text-lg"></i>
                    Consultar por WhatsApp
                </a>
                <p class="text-gray-600 mt-2 text-xs">098 1813 395</p>
            </div>
        </div>

        <!-- Resultados -->
        <div class="lg:col-span-2 space-y-3 md:space-y-4" id="resultados" style="display: none;">
            <!-- Resumen de Ahorro -->
            <div class="bg-green-600 rounded-lg p-3 md:p-4 card-shadow animate-fade-in">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <p class="text-green-50 text-xs uppercase tracking-wide font-medium">Tu Ahorro con ChevyPlan</p>
                        <p class="text-2xl md:text-3xl font-bold text-white mt-1" id="ahorroTotal">$0</p>
                        <p class="text-green-50 text-xs mt-0.5" id="ahorroDetalle"></p>
                    </div>
                    <div class="bg-white/20 rounded-full p-2.5">
                        <i class="fas fa-piggy-bank text-2xl md:text-3xl text-white"></i>
                    </div>
                </div>
            </div>

            <!-- Comparación de Opciones -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- ChevyPlan -->
                <div class="bg-white rounded-lg p-3 md:p-4 card-shadow border-2 border-green-500 animate-fade-in">
                    <div class="flex items-center justify-between mb-2.5">
                        <h3 class="text-base font-semibold text-gray-800 flex items-center gap-1.5">
                            <i class="fas fa-star text-yellow-500 text-sm"></i>
                            ChevyPlan
                        </h3>
                        <span class="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                            RECOMENDADO
                        </span>
                    </div>
                    
                    <div class="space-y-2.5">
                        <div class="bg-gray-50 rounded-md p-2.5 border border-gray-200">
                            <p class="text-gray-600 text-xs font-medium">Cuota Mensual</p>
                            <p class="result-number text-green-600" id="cuotaChevy">$0</p>
                        </div>
                        
                        <div class="space-y-1 text-xs text-gray-700">
                            <div class="flex justify-between">
                                <span>Monto Financiado:</span>
                                <strong id="montoChevy">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Intereses:</span>
                                <strong class="text-green-600" id="interesChevy">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Total a Pagar:</span>
                                <strong class="text-gray-900" id="totalChevy">$0</strong>
                            </div>
                            <div class="flex justify-between pt-1 border-t border-gray-200">
                                <span>Tasa:</span>
                                <strong>3.59% anual</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Crédito Bancario -->
                <div class="bg-white rounded-lg p-3 md:p-4 card-shadow border-2 border-red-400 animate-fade-in">
                    <div class="flex items-center justify-between mb-2.5">
                        <h3 class="text-base font-semibold text-gray-800 flex items-center gap-1.5">
                            <i class="fas fa-university text-gray-600 text-sm"></i>
                            Crédito Bancario
                        </h3>
                        <span class="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                            MÁS CARO
                        </span>
                    </div>
                    
                    <div class="space-y-2.5">
                        <div class="bg-gray-50 rounded-md p-2.5 border border-gray-200">
                            <p class="text-gray-600 text-xs font-medium">Cuota Mensual</p>
                            <p class="result-number text-red-600" id="cuotaBancario">$0</p>
                        </div>
                        
                        <div class="space-y-1 text-xs text-gray-700">
                            <div class="flex justify-between">
                                <span>Monto Financiado:</span>
                                <strong id="montoBancario">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Intereses:</span>
                                <strong class="text-red-600" id="interesBancario">$0</strong>
                            </div>
                            <div class="flex justify-between">
                                <span>Total a Pagar:</span>
                                <strong class="text-gray-900" id="totalBancario">$0</strong>
                            </div>
                            <div class="flex justify-between pt-1 border-t border-gray-200">
                                <span>Tasa:</span>
                                <strong>16% anual</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráfico Comparativo -->
            <div class="bg-white rounded-lg p-3 md:p-4 card-shadow animate-fade-in">
                <h3 class="text-base font-semibold text-gray-800 mb-2.5 flex items-center gap-2">
                    <i class="fas fa-chart-bar text-gray-600 text-sm"></i>
                    Comparación Visual
                </h3>
                <canvas id="comparisonChart" height="70"></canvas>
            </div>

            <!-- Botón de WhatsApp (solo visible en móvil) -->
            <div class="lg:hidden bg-white rounded-lg p-3 md:p-4 card-shadow text-center animate-fade-in">
                <h3 class="text-sm font-semibold text-gray-800 mb-2">¿Listo para tu ChevyPlan?</h3>
                <a href="https://wa.me/593981813395" 
                   target="_blank"
                   class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-5 rounded-md text-sm transition-all w-full justify-center">
                    <i class="fab fa-whatsapp text-lg"></i>
                    Consultar por WhatsApp
                </a>
                <p class="text-gray-600 mt-2 text-xs">098 1813 395</p>
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
            document.getElementById('resultados').style.display = 'block';
            document.getElementById('resultados').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            document.getElementById('ahorroTotal').textContent = formatCurrency(data.ahorroTotal);
            document.getElementById('ahorroDetalle').textContent = 
                \`Ahorras \${formatCurrency(data.diferenciaCuota)} mensuales\`;

            document.getElementById('cuotaChevy').textContent = formatCurrency(data.chevyPlan.cuotaMensual);
            document.getElementById('montoChevy').textContent = formatCurrency(data.monto);
            document.getElementById('interesChevy').textContent = formatCurrency(data.chevyPlan.costoFinanciamiento);
            document.getElementById('totalChevy').textContent = formatCurrency(data.chevyPlan.montoTotal);

            document.getElementById('cuotaBancario').textContent = formatCurrency(data.bancario.cuotaMensual);
            document.getElementById('montoBancario').textContent = formatCurrency(data.monto);
            document.getElementById('interesBancario').textContent = formatCurrency(data.bancario.costoFinanciamiento);
            document.getElementById('totalBancario').textContent = formatCurrency(data.bancario.montoTotal);

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
                            label: 'ChevyPlan',
                            data: [
                                data.chevyPlan.cuotaMensual,
                                data.chevyPlan.costoFinanciamiento,
                                data.chevyPlan.montoTotal
                            ],
                            backgroundColor: 'rgba(200, 164, 94, 0.8)',
                            borderColor: 'rgba(200, 164, 94, 1)',
                            borderWidth: 2
                        },
                        {
                            label: 'Crédito Bancario',
                            data: [
                                data.bancario.cuotaMensual,
                                data.bancario.costoFinanciamiento,
                                data.bancario.montoTotal
                            ],
                            backgroundColor: 'rgba(220, 38, 38, 0.8)',
                            borderColor: 'rgba(220, 38, 38, 1)',
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
                                color: '#374151',
                                font: {
                                    size: 11,
                                    weight: '600'
                                },
                                padding: 12
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
                                color: '#6B7280',
                                font: {
                                    size: 10
                                },
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#374151',
                                font: {
                                    size: 10,
                                    weight: '600'
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

        window.addEventListener('load', () => {
            document.getElementById('calculatorForm').dispatchEvent(new Event('submit'));
        });
    </script>
</body>
</html>`;
  
  return c.html(html);
});

app.get('/health', (c) => {
    return c.text('ok', 200);
});

export default app;