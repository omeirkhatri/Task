/**
 * useDispatcherState Hook
 * 
 * Manages synchronized state between all three panels of the Dispatcher Board:
 * - Selected driver
 * - Selected appointment
 * - Route updates
 * - Date selection
 */

import { useState, useCallback, useMemo } from "react";
import type { DriverTrip, TripLeg, Appointment, Staff } from "../../types";
import type { Identifier } from "ra-core";

export type DispatcherState = {
  selectedDate: Date;
  selectedDriverId: Identifier | null;
  selectedAppointmentId: Identifier | null;
  selectedTripId: Identifier | null;
  hoveredAppointmentId: Identifier | null;
  hoveredLegId: Identifier | null;
};

export type DispatcherStateActions = {
  setSelectedDate: (date: Date) => void;
  setSelectedDriver: (driverId: Identifier | null) => void;
  setSelectedAppointment: (appointmentId: Identifier | null) => void;
  setSelectedTrip: (tripId: Identifier | null) => void;
  setHoveredAppointment: (appointmentId: Identifier | null) => void;
  setHoveredLeg: (legId: Identifier | null) => void;
  clearSelection: () => void;
};

export function useDispatcherState(initialDate?: Date) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate || new Date()
  );
  const [selectedDriverId, setSelectedDriverId] = useState<Identifier | null>(
    null
  );
  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<Identifier | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<Identifier | null>(null);
  const [hoveredAppointmentId, setHoveredAppointmentId] =
    useState<Identifier | null>(null);
  const [hoveredLegId, setHoveredLegId] = useState<Identifier | null>(null);

  const setSelectedDriver = useCallback((driverId: Identifier | null) => {
    setSelectedDriverId(driverId);
    // Clear appointment selection when driver changes
    if (driverId !== selectedDriverId) {
      setSelectedAppointmentId(null);
      setSelectedTripId(null);
    }
  }, [selectedDriverId]);

  const setSelectedAppointment = useCallback(
    (appointmentId: Identifier | null) => {
      setSelectedAppointmentId(appointmentId);
    },
    []
  );

  const setSelectedTrip = useCallback((tripId: Identifier | null) => {
    setSelectedTripId(tripId);
  }, []);

  const setHoveredAppointment = useCallback(
    (appointmentId: Identifier | null) => {
      setHoveredAppointmentId(appointmentId);
    },
    []
  );

  const setHoveredLeg = useCallback((legId: Identifier | null) => {
    setHoveredLegId(legId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDriverId(null);
    setSelectedAppointmentId(null);
    setSelectedTripId(null);
    setHoveredAppointmentId(null);
    setHoveredLegId(null);
  }, []);

  const state: DispatcherState = useMemo(
    () => ({
      selectedDate,
      selectedDriverId,
      selectedAppointmentId,
      selectedTripId,
      hoveredAppointmentId,
      hoveredLegId,
    }),
    [
      selectedDate,
      selectedDriverId,
      selectedAppointmentId,
      selectedTripId,
      hoveredAppointmentId,
      hoveredLegId,
    ]
  );

  const actions: DispatcherStateActions = useMemo(
    () => ({
      setSelectedDate,
      setSelectedDriver,
      setSelectedAppointment,
      setSelectedTrip,
      setHoveredAppointment,
      setHoveredLeg,
      clearSelection,
    }),
    [
      setSelectedDriver,
      setSelectedAppointment,
      setSelectedTrip,
      setHoveredAppointment,
      setHoveredLeg,
      clearSelection,
    ]
  );

  return { state, actions };
}

