import { Department, Patient, HospitalRoom, InpatientStay } from './types';

export const DEPARTMENTS: Department[] = [];

export const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_ROOMS: HospitalRoom[] = [];

export const INITIAL_STAYS: InpatientStay[] = [];
