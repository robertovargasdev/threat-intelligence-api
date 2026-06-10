# 🛡️ Threat Intelligence API

Una API RESTful stateless de alto rendimiento diseñada para analizar direcciones IP en tiempo real, detectar tráfico malicioso (Proxies, VPNs, Nodos TOR) y calcular un puntaje de riesgo normalizado.

Este proyecto actúa como un orquestador que consulta múltiples fuentes de inteligencia de forma concurrente, optimizando la latencia mediante caché en memoria y protegiendo sus propios recursos con limitación de peticiones (Rate Limiting).

## Tecnologías

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=reactivex&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=white)

## Aprendizaje y Arquitectura

Este proyecto fue desarrollado como un laboratorio de arquitectura de software, consolidando los siguientes conceptos técnicos:

* **Orquestación Asíncrona:** Uso de `Promise.all` y `RxJS Observables` para resolver múltiples peticiones HTTP a proveedores externos simultáneamente, reduciendo drásticamente la latencia de respuesta.
* **Patrón Cache-Aside:** Implementación de caché en memoria RAM para evitar peticiones redundantes a las APIs externas, previniendo el envenenamiento de caché ante respuestas fallidas y ahorrando cuotas de uso.
* **Defensa Perimetral:** Configuración de `ThrottlerGuard` global para mitigar ataques DDoS y abusos de consumo.
* **Testing Aislado:** Iniciación al uso de pruebas unitarias (Unit Testing) de caja blanca mediante inyección de dependencias y `Mocks`, simulando el comportamiento de redes y caché sin depender de conexión a internet.
* **Contenedores Stateless:** Optimización de `Dockerfile` multi-etapa (Multi-stage build) excluyendo dependencias de desarrollo para crear una imagen de producción ultraligera.

## ⚙️ Funcionalidades Principales

### 1. Integración de Inteligencia (OSINT)
La API actúa como un *Facade*, consultando tres fuentes de inteligencia:
* **AbuseIPDB:** Para reportes históricos de spam y ataques cibernéticos.
* **IP-API:** Para geolocalización precisa y detección de Data Centers / Hosting.
* **ProxyCheck:** Para identificar conexiones ofuscadas (VPN, Proxy, TOR).

### 2. Motor de Evaluación de Riesgo (Risk Score)
La respuesta cruda es procesada por un algoritmo determinista que devuelve un nivel de riesgo accionable por el Frontend (`Low`, `Medium`, `High`, `Critical`) basado en:
* Penalizaciones moderadas (+20 pts) por uso de VPNs.
* Penalizaciones críticas (+50 pts) por uso de nodos de la red TOR.
* Detección de tráfico proveniente de servidores en la nube en lugar de redes residenciales (+15 pts).

### 3. Limitación de Peticiones (Rate Limiting)
Limita el consumo de la API para evitar ataques DDoS y abusos de consumo.

### 4. Caché en Memoria (Cache-Aside)
Utiliza un caché en memoria para evitar peticiones redundantes a las APIs externas, previniendo el envenenamiento de caché ante respuestas fallidas y ahorrando cuotas de uso.

## 🛡️ Reusabilidad: Integración Continua mediante Guards

La arquitectura puramente modular de este proyecto permite extraer la carpeta `src/modules/threat` e integrarla directamente como una librería interna en cualquier otro proyecto monolítico de NestJS (por ejemplo, una plataforma e-commerce o un sistema bancario).

En lugar de validar las IPs manualmente en cada endpoint, el poder real de este módulo se despliega al envolver el `ThreatService` dentro de un **Guard**. Esto crea un escudo de red que evalúa el tráfico en el ciclo de vida temprano de la petición, bloqueando atacantes en seco sin "contaminar" la lógica de negocio de tus controladores.

### Ejemplo de Implementación (ThreatGuard)

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ThreatService } from './threat/threat.service';

@Injectable()
export class ThreatGuard implements CanActivate {
  constructor(private readonly threatService: ThreatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Extracción estándar de IP (ajustable según tu proxy reverso/Nginx)
    const clientIp = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    const report = await this.threatService.analyzeIp(clientIp);

    // ⛔ Bloqueo automático si se detecta un nodo TOR o servidor comprometido
    if (report.riskLevel === 'Critical') {
      throw new ForbiddenException('Security Policy: Acceso denegado por tráfico anómalo o red maliciosa.');
    }

    return true; // ✅ El tráfico es seguro, la petición continúa
  }
}
```

### Aplicación Quirúrgica en Rutas Críticas
Al aislar la lógica en un Guard, puedes aplicar este costoso análisis de OSINT únicamente en los endpoints que realmente lo necesitan (como pasarelas de pago o inicios de sesión), ahorrando cuotas de API y manteniendo rápida la navegación general del usuario.

``` typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ThreatGuard } from '../threat/threat.guard';

@Controller('checkout')
export class CheckoutController {
  
  @Post('pay')
  @UseGuards(ThreatGuard) // Escudo de inteligencia activado
  async processPayment(@Body() paymentData: PaymentDto) {
    // Si la petición llega aquí, la IP está matemáticamente comprobada como "Segura"
    return this.paymentService.process(paymentData);
  }
}
```

## 💻 Instalación y Ejecución Local

### Prerrequisitos
* [Docker](https://www.docker.com/) y Docker Compose instalados.
* Una API Key gratuita de [AbuseIPDB](https://www.abuseipdb.com/).

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/robertovargasdev/threat-intelligence-api.git
cd threat-intelligence-api
```

### Paso 2: Configurar las variables de entorno
Crea un archivo llamado .env en la raíz del proyecto copiando la plantilla base:
```bash
cp .env.example .env
```

Abre el archivo .env y coloca tu llave privada, creala en este servicio de [AbuseIPDB](https://www.abuseipdb.com/).

```bash
ABUSEIPDB_API_KEY="tu_clave_secreta_aqui"
```

### Paso 3: Levantar el contenedor
Ejecuta el siguiente comando para construir la imagen e iniciar la API:

```bash
docker compose up -d --build
```

### Paso 4: Prueba a la API
Una vez que el contenedor esté en verde, puedes probar el análisis de una IP usando tu navegador, Postman o cURL:

```bash
# Analizar el DNS de Google
curl http://localhost:3000/threat/8.8.8.8
```

Salida esperada:
```json
{
    "statusCode": 200,
    "message": "Operación ejecutada con éxito",
    "data": {
        "ip": "8.8.8.8",
        "riskScore": 0,
        "riskLevel": "Low",
        "isProxyOrVPN": false,
        "raw_data": {
            "abuse": {
                "data": {
                    "ipAddress": "8.8.8.8",
                    "isPublic": true,
                    "ipVersion": 4,
                    "isWhitelisted": true,
                    "abuseConfidenceScore": 0,
                    "countryCode": "US",
                    "usageType": "Content Delivery Network",
                    "isp": "Google LLC",
                    "domain": "google.com",
                    "hostnames": [
                        "dns.google"
                    ],
                    "isTor": false,
                    "totalReports": 60,
                    "numDistinctUsers": 37,
                    "lastReportedAt": "2026-06-07T14:00:05+00:00"
                }
            },
            "geolocation": {
                "status": "success",
                "country": "United States",
                "countryCode": "US",
                "region": "VA",
                "regionName": "Virginia",
                "city": "Ashburn",
                "zip": "20149",
                "lat": 39.03,
                "lon": -77.5,
                "timezone": "America/New_York",
                "isp": "Google LLC",
                "org": "Google Public DNS",
                "as": "AS15169 Google LLC",
                "query": "8.8.8.8"
            },
            "proxy": {
                "status": "ok",
                "8.8.8.8": {
                    "asn": "AS15169",
                    "range": "8.8.8.0/24",
                    "hostname": "dns.google",
                    "provider": "Google LLC",
                    "organisation": "Level 3",
                    "continent": "North America",
                    "continentcode": "NA",
                    "country": "United States",
                    "isocode": "US",
                    "region": "California",
                    "regioncode": "CA",
                    "timezone": "America/Los_Angeles",
                    "city": "Mountain View",
                    "postcode": "94043",
                    "latitude": 37.422,
                    "longitude": -122.085,
                    "currency": {
                        "code": "USD",
                        "name": "Dollar",
                        "symbol": "$"
                    },
                    "devices": {
                        "address": 0,
                        "subnet": 6
                    },
                    "proxy": "no",
                    "type": "Business"
                }
            }
        },
        "source": "network",
        "executionTimeMs": 370
    },
    "timestamp": "2026-06-08T02:03:42.457Z",
    "path": "/api/threat/8.8.8.8"
}
```

## Documentación
Para ver la documentación completa generada automáticamente, visita: http://localhost:3000/api/docs
