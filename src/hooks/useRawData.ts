// src/hooks/useRawData.ts
import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { EmploymentDataRow } from '../lib/types';

const DATA_URL = '/SPC,DF_EMPLOYED_FTPT,1.0+A....._T._T..csv'; // Sesuaikan path jika berbeda

export const useRawData = () => {
  const [data, setData] = useState<EmploymentDataRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    d3.csv(DATA_URL)
      .then((parsedData) => {
        const typedData = parsedData.map((d: any) => ({
          ...d,
          OBS_VALUE: d.OBS_VALUE && d.OBS_VALUE.trim() !== '' ? +d.OBS_VALUE.replace(/,/g, '') : null, // Hapus koma dan konversi ke angka
          TIME_PERIOD: d.TIME_PERIOD, // Pastikan ini juga sesuai
        })) as EmploymentDataRow[];
        setData(typedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading or parsing CSV data:", err);
        setError("Failed to load data.");
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
};