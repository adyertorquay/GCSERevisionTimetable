
import React, { useState, useRef, useEffect } from 'react';
import { format, parseISO, eachDayOfInterval, isBefore, compareAsc, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { createEvents } from 'ics';

const allSubjects = [
  'Maths', 'English Language', 'English Literature', 'Biology', 'Chemistry', 'Physics',
  'Geography', 'History', 'French', 'Spanish',
  'Business', 'Automotive', 'Religious Studies', 'Music',
  'Food Tech', 'Health and Social', 'IT', 'Construction', 'Statistics',
  'Sport', 'Design Technology', 'Media Studies', 'Hospitality & Catering'
];


const examDates = {
  'Health and Social': ['2025-05-06'],
  Construction: ['2025-05-06'],
  Business: ['2025-05-09', '2025-05-16'],
  'English Literature': ['2025-05-12', '2025-05-20'],
  'Religious Studies': ['2025-05-13', '2025-05-21'],
  Biology: ['2025-05-13', '2025-06-09'],
  Geography: ['2025-05-14', '2025-06-06', '2025-06-12'],
  'Media Studies': ['2025-05-14', '2025-05-22'],
  Maths: ['2025-05-15', '2025-06-04', '2025-06-11'],
  History: ['2025-05-16', '2025-06-05', '2025-06-10'],
  Chemistry: ['2025-05-19', '2025-06-13'],
  French: ['2025-05-21', '2025-06-05'],
  Physics: ['2025-05-22', '2025-06-16'],
  Sport: ['2025-05-22'],
  'English Language': ['2025-05-23', '2025-06-06'],
  Statistics: ['2025-06-02', '2025-06-13'],
  Automotive: ['2025-06-02'],
  IT: ['2025-06-09'],
  Spanish: ['2025-06-10', '2025-06-17'],
  Music: ['2025-06-05'],
  'Food Tech': ['2025-06-06'],
  'Design Technology': ['2025-06-18'],
  'Hospitality & Catering': ['2025-05-07']
};

const GCSEPlanner = () => {
  const calendarRef = useRef();
  const startDate = new Date('2025-04-04');
  const endDate = new Date('2025-07-19');
  const intensiveStart = new Date('2025-05-01');

  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availability, setAvailability] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  });

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  const handleAvailabilityChange = (day, time) => {
    setAvailability(prev => {
      const updated = new Set(prev[day]);
      if (updated.has(time)) updated.delete(time);
      else updated.add(time);
      return { ...prev, [day]: [...updated].sort() };

  const toggleSubject = subject => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );

  const generateRevisionEvents = () => {
    const revisionEvents = [];
    const revisionDays = eachDayOfInterval({ start: startDate, end: endDate });
    const sessionMap = {};
    const daySlots = {};
    const earlyPhaseEnd = new Date('2025-04-21');

    revisionDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE');
      daySlots[key] = availability[dayName] || [];
      sessionMap[key] = [];

    const examSchedule = selectedSubjects.map(subject => {
      const exams = (examDates[subject] || []).map(parseISO);
      const finalExam = exams.sort(compareAsc)[exams.length - 1];
      return { subject, exams, finalExam };
    }).sort((a, b) => compareAsc(a.finalExam, b.finalExam));

    // Day-before exam revision
    examSchedule.forEach(({ subject, exams }) => {
      exams.forEach(examDate => {
        const dayBefore = format(subDays(examDate, 1), 'yyyy-MM-dd');
        const slots = daySlots[dayBefore] || [];
        for (const slot of slots) {
          if (!sessionMap[dayBefore].includes(subject)) {
            revisionEvents.push({ title: `Revise ${subject}`, date: dayBefore, time: slot, color: '#1E40AF' });
            sessionMap[dayBefore].push(subject);
            break;
        }

    // Balanced revision between 4th–21st April
    let roundRobinIndex = 0;
    revisionDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      const slots = daySlots[key];
      if (!slots.length || sessionMap[key].length >= slots.length) return;

      const isEarlyPhase = isBefore(day, earlyPhaseEnd);
      if (isEarlyPhase) {
        for (let i = 0; i < slots.length; i++) {
          const subject = selectedSubjects[roundRobinIndex % selectedSubjects.length];
          if (!sessionMap[key].includes(subject)) {
            revisionEvents.push({ title: `Revise ${subject}`, date: key, time: slots[i], color: '#3B82F6' });
            sessionMap[key].push(subject);
            roundRobinIndex++;
      }

    // Focused post-Easter revision
    revisionDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      const slots = daySlots[key];
      if (!slots.length || sessionMap[key].length >= slots.length) return;

      const isPostEaster = !isBefore(day, earlyPhaseEnd);
      if (isPostEaster) {
        for (const slot of slots) {
          for (const { subject, exams } of examSchedule) {
            const nextExam = exams.find(d => isBefore(day, d));
            if (nextExam && !sessionMap[key].includes(subject)) {
              revisionEvents.push({ title: `Revise ${subject}`, date: key, time: slot, color: '#60A5FA' });
              sessionMap[key].push(subject);
              break;
      }

    return revisionEvents;

  const examEvents = Object.entries(examDates).flatMap(([subject, dates]) =>
    selectedSubjects.includes(subject)
      ? dates.map(date => ({
          title: `${subject} Exam${examTimes[date] ? ' – ' + examTimes[date].time : ''}`,
          date,
          time: examTimes[date]?.time || '09:00',
          color: '#FF5733'
        }))
      : []
  );

  const revisionEvents = generateRevisionEvents();

  const exportICS = () => {
    const allEvents = [...examEvents, ...revisionEvents].map(e => {
      const [year, month, day] = e.date.split('-').map(Number);
      if (e.title.includes('Exam')) {
        return {
          start: [year, month, day],
          title: e.title,
          status: 'CONFIRMED'
        };
      } else {
        const [hour, minute] = (e.time || '09:00').split(':').map(Number);
        return {
          start: [year, month, day, hour, minute],
          duration: { hours: 1 },
          title: e.title,
          status: 'CONFIRMED'
        };
      }
    });

    createEvents(allEvents, (error, value) => {
      if (error) {
        console.log(error);
        return;
      }
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'gcse_revision_schedule.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };
      } else {
        const [hour, minute] = (e.time || '09:00').split(':').map(Number);
        return {
          start: [year, month, day, hour, minute],
          duration: { hours: 1 },
          title: e.title,
          status: 'CONFIRMED'
        };
    });
