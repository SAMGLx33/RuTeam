import { expect, test } from '@jest/globals';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { PhotonGeocodingProvider } from '../dist/src/modules/geocoding/infrastructure/photon-geocoding.provider.js';

const feature = (coordinates, properties) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties,
});
const collection = (features) => ({ type: 'FeatureCollection', features });

async function withProvider(handler, action) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const provider = new PhotonGeocodingProvider({
      GEOCODING_BASE_URL: `http://127.0.0.1:${server.address().port}/photon`,
    });
    return await action(provider);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('geocodificación no configurada devuelve 503', async () => {
  await expect(
    new PhotonGeocodingProvider({}).search('Pampalinda Cali'),
  ).rejects.toMatchObject({ status: 503 });
});

test('Photon devuelve opciones distinguibles, valida coordenadas y elimina duplicados', async () => {
  let url;
  let language;
  const cali = feature([-76.54, 3.41], {
    name: 'Parque Central',
    district: 'Pampalinda',
    city: 'Cali',
    countrycode: 'CO',
  });
  await withProvider(
    (req, res) => {
      url = new URL(req.url, 'http://localhost');
      language = req.headers['accept-language'];
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify(
          collection([
            cali,
            cali,
            feature([-76.31, 3.55], {
              name: 'Parque Central',
              city: 'Palmira',
            }),
            feature([181, 3.5], { name: 'Inválido' }),
            feature([-76.3, 3.55], { name: 'Otro país', countrycode: 'EC' }),
            feature([-76.38, 3.52], {
              street: 'Calle 5',
              housenumber: '62-00',
            }),
          ]),
        ),
      );
    },
    async (provider) => {
      await expect(provider.search('Parque & Calle #5')).resolves.toEqual({
        items: [
          {
            label: 'Parque Central',
            context: 'Pampalinda · Cali',
            longitude: -76.54,
            latitude: 3.41,
          },
          {
            label: 'Parque Central',
            context: 'Palmira',
            longitude: -76.31,
            latitude: 3.55,
          },
          {
            label: 'Calle 5 62-00',
            context: '',
            longitude: -76.38,
            latitude: 3.52,
          },
        ],
        attribution: 'Datos © OpenStreetMap contributors',
      });
      expect(url.pathname).toBe('/photon/api');
      expect(url.searchParams.get('q')).toBe('Parque & Calle #5');
      expect(url.searchParams.get('countrycode')).toBe('CO');
      expect(url.searchParams.get('limit')).toBe('6');
      expect(url.searchParams.has('lat')).toBe(true);
      expect(url.searchParams.has('lang')).toBe(false);
      expect(language).toBe('es-CO,es;q=0.9');
    },
  );
});

test('colección vacía conserva la ausencia de coincidencia', async () => {
  await withProvider(
    (_req, res) => res.end(JSON.stringify(collection([]))),
    async (provider) => {
      await expect(
        provider.search('Lugar sin coincidencias'),
      ).resolves.toMatchObject({ items: [] });
    },
  );
});

test('formato inválido y error del proveedor distinguen indisponibilidad de búsqueda vacía', async () => {
  await withProvider(
    (req, res) => {
      if (req.url.includes('saturado')) res.writeHead(429);
      res.end(JSON.stringify({ data: [] }));
    },
    async (provider) => {
      await expect(provider.search('Formato inesperado')).rejects.toMatchObject(
        { status: 502 },
      );
      await expect(provider.search('Proveedor saturado')).rejects.toMatchObject(
        { status: 503 },
      );
    },
  );
});

test('cancelar una búsqueda en curso cierra la conexión con el proveedor', async () => {
  let notifyRequest;
  let notifyClose;
  const requested = new Promise((resolve) => (notifyRequest = resolve));
  const closed = new Promise((resolve) => (notifyClose = resolve));
  await withProvider(
    (_req, res) => {
      res.once('close', notifyClose);
      notifyRequest();
    },
    async (provider) => {
      const controller = new globalThis.AbortController();
      const search = expect(
        provider.search('Pampalinda Cali', controller.signal),
      ).rejects.toMatchObject({
        status: 502,
      });
      await requested;
      controller.abort();
      await search;
      await closed;
    },
  );
});
