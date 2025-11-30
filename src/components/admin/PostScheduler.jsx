import React, { useState } from 'react';
import { Calendar, Clock, Save } from 'lucide-react';
import { format } from 'date-fns';

const PostScheduler = ({ onSchedule, initialDate, initialTime }) => {
  const [scheduledDate, setScheduledDate] = useState(
    initialDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [scheduledTime, setScheduledTime] = useState(
    initialTime || format(new Date(), 'HH:mm')
  );
  const [isScheduled, setIsScheduled] = useState(!!initialDate);

  const handleSchedule = () => {
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledDateTime <= new Date()) {
      alert('Scheduled date must be in the future');
      return;
    }
    onSchedule(scheduledDateTime);
    setIsScheduled(true);
  };

  const handleRemoveSchedule = () => {
    onSchedule(null);
    setIsScheduled(false);
    setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
    setScheduledTime(format(new Date(), 'HH:mm'));
  };

  const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  const isValid = scheduledDateTime > new Date();

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--surface-subtle)]">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-[var(--accent)]" />
        <h3 className="font-semibold text-primary">Schedule Publication</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Date
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Time
          </label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        {isValid && (
          <div className="p-3 rounded-lg bg-[var(--surface-bg)] border border-[var(--border-subtle)]/60">
            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Will be published on {format(scheduledDateTime, 'PPp')}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {isScheduled ? (
            <>
              <button
                type="button"
                onClick={handleSchedule}
                className="btn btn-primary flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Update Schedule
              </button>
              <button
                type="button"
                onClick={handleRemoveSchedule}
                className="btn btn-outline text-[var(--text-secondary)]"
              >
                Remove Schedule
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSchedule}
              disabled={!isValid}
              className="btn btn-primary flex-1 disabled:opacity-50"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Post
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostScheduler;

