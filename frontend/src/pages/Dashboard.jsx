import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  Users, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  PlusCircle, 
  Trash2, 
  SlidersHorizontal,
  RefreshCw,
  Plus
} from 'lucide-react';

const Dashboard = ({ onViewChange }) => {
  const { user, logout, token } = useAuth();
  
  // Tab states
  const [isAdminTab, setIsAdminTab] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('bookings'); // 'bookings' or 'tables'

  // Common UI State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Customer State: Booking form inputs
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('18:00-19:30');
  const [guests, setGuests] = useState(2);
  const [selectedTable, setSelectedTable] = useState(null);

  // Lists from backend
  const [tables, setTables] = useState([]);
  const [occupiedTableIds, setOccupiedTableIds] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  
  // Admin Filter
  const [adminFilterDate, setAdminFilterDate] = useState('');

  // Admin New Table Form
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableCap, setNewTableCap] = useState(4);

  // Admin Editing Reservation State
  const [editingReservation, setEditingReservation] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState('');
  const [editGuests, setEditGuests] = useState(2);
  const [editTableId, setEditTableId] = useState('');

  // Table Edit states
  const [editingTable, setEditingTable] = useState(null);
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editTableCapacity, setEditTableCapacity] = useState(4);
  const [editTableActive, setEditTableActive] = useState(true);

  // Time Slots definition
  const slots = [
    '12:00-13:30',
    '13:30-15:00',
    '18:00-19:30',
    '19:30-21:00',
    '21:00-22:30'
  ];

  // Fetch all tables
  const fetchTables = async () => {
    try {
      const isAdmin = user?.role === 'admin';
      const url = isAdmin ? '/api/tables?all=true' : '/api/tables';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
      }
    } catch (err) {
      console.error('Fetch tables error:', err);
    }
  };

  // Fetch occupied tables for selected date/slot
  const fetchOccupiedTables = async () => {
    if (!date || !timeSlot) return;
    try {
      const res = await fetch(`/api/reservations/occupied?date=${date}&timeSlot=${timeSlot}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOccupiedTableIds(data.occupiedTableIds || []);
      }
    } catch (err) {
      console.error('Fetch occupied error:', err);
    }
  };

  // Fetch customer's own reservations
  const fetchMyReservations = async () => {
    try {
      const res = await fetch('/api/reservations/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyReservations(data.data);
      }
    } catch (err) {
      console.error('Fetch my reservations error:', err);
    }
  };

  // Fetch admin reservations
  const fetchAllReservations = async (filterDate = '') => {
    try {
      const url = filterDate 
        ? `/api/reservations?date=${filterDate}`
        : '/api/reservations';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAllReservations(data.data);
      }
    } catch (err) {
      console.error('Fetch admin bookings error:', err);
    }
  };

  // Trigger loads on Mount or token change
  useEffect(() => {
    if (token) {
      fetchTables();
      if (user?.role === 'admin') {
        fetchAllReservations();
        setIsAdminTab(true);
      } else {
        fetchMyReservations();
      }
    }
  }, [token, user]);

  // Update occupied tables when selection parameters change
  useEffect(() => {
    if (token) {
      fetchOccupiedTables();
      // Reset selected table when dates/slots change
      setSelectedTable(null);
    }
  }, [date, timeSlot, token]);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedTable) {
      setErrorMsg('Please select a table from the grid below.');
      return;
    }

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tableId: selectedTable._id,
          date,
          timeSlot,
          guests: parseInt(guests)
        })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(`Reservation confirmed on ${date} for ${guests} guests!`);
        setSelectedTable(null);
        fetchMyReservations();
        fetchOccupiedTables();
      } else {
        setErrorMsg(data.error || 'Failed to create reservation.');
      }
    } catch (err) {
      setErrorMsg('Connection error. Please try again.');
    }
  };

  const handleCancelReservation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Reservation successfully cancelled.');
        if (user.role === 'admin') {
          fetchAllReservations(adminFilterDate);
        } else {
          fetchMyReservations();
        }
        fetchOccupiedTables();
      } else {
        setErrorMsg(data.error || 'Could not cancel reservation.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  // Admin: Update status directly (confirm or cancel)
  const handleUpdateStatus = async (id, newStatus) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Reservation marked as ${newStatus}.`);
        fetchAllReservations(adminFilterDate);
        fetchOccupiedTables();
      } else {
        setErrorMsg(data.error || 'Failed to update reservation.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  // Admin: Create table
  const handleCreateTable = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!newTableNum || !newTableCap) {
      setErrorMsg('Please specify Table Name/Number and seating capacity.');
      return;
    }

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tableNumber: newTableNum,
          capacity: parseInt(newTableCap)
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Table "${newTableNum}" added successfully.`);
        setNewTableNum('');
        fetchTables();
      } else {
        setErrorMsg(data.error || 'Failed to create table.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  const handleStartEdit = (res) => {
    setEditingReservation(res);
    setEditDate(res.date);
    setEditTimeSlot(res.timeSlot);
    setEditGuests(res.guests);
    setEditTableId(res.table?._id || res.table || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!editingReservation) return;

    try {
      const res = await fetch(`/api/reservations/${editingReservation._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tableId: editTableId,
          date: editDate,
          timeSlot: editTimeSlot,
          guests: parseInt(editGuests)
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Reservation updated successfully.');
        setEditingReservation(null);
        fetchAllReservations(adminFilterDate);
        fetchOccupiedTables();
      } else {
        setErrorMsg(data.error || 'Failed to update reservation.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  // Table Edit handlers
  const handleStartEditTable = (table) => {
    setEditingTable(table);
    setEditTableNumber(table.tableNumber);
    setEditTableCapacity(table.capacity);
    setEditTableActive(table.isActive);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveEditTable = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!editingTable) return;

    try {
      const res = await fetch(`/api/tables/${editingTable._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tableNumber: editTableNumber,
          capacity: parseInt(editTableCapacity),
          isActive: editTableActive
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Table "${editTableNumber}" updated successfully.`);
        setEditingTable(null);
        fetchTables();
        if (user?.role === 'admin') {
          fetchAllReservations(adminFilterDate);
        }
      } else {
        setErrorMsg(data.error || 'Failed to update table.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  const handleAdminFilterChange = (e) => {
    const filterVal = e.target.value;
    setAdminFilterDate(filterVal);
    fetchAllReservations(filterVal);
  };

  const handleLogout = () => {
    logout();
    onViewChange('login');
  };

  const renderChairs = (capacity, isOccupied, isSelected) => {
    const chairs = [];
    const radius = 42; // distance from center of table in percentage
    for (let i = 0; i < capacity; i++) {
      const angle = (i * 2 * Math.PI) / capacity - Math.PI / 2; // offset by 90deg to start from top
      const x = Math.round(50 + Math.cos(angle) * radius);
      const y = Math.round(50 + Math.sin(angle) * radius);
      
      let chairColor = 'rgba(255, 255, 255, 0.15)'; // available default
      if (isOccupied) {
        chairColor = 'rgba(166, 159, 149, 0.1)'; // occupied dim
      } else if (isSelected) {
        chairColor = 'var(--color-primary)'; // selected gold
      }
      
      chairs.push(
        <div 
          key={i} 
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: chairColor,
            border: isSelected ? '1px solid var(--text-main)' : '1px solid rgba(255,255,255,0.08)',
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.3s ease',
            animation: isSelected ? 'pulse-selected 2s infinite ease-in-out' : 'none'
          }}
        />
      );
    }
    return chairs;
  };

  return (
    <div>
      {/* Navigation Header */}
      <header className="navbar">
        <div className="nav-brand" onClick={() => setIsAdminTab(user?.role === 'admin')}>
          🍽️ TableReserve
        </div>
        <div className="nav-links">
          {user?.role === 'admin' && (
            <button 
              className={`btn btn-secondary ${isAdminTab ? 'btn-primary' : ''}`}
              onClick={() => setIsAdminTab(!isAdminTab)}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              {isAdminTab ? 'Switch to Customer View' : 'Admin Panel'}
            </button>
          )}
          <div className="nav-user">
            <span className="nav-user-name">
              Hello, <strong>{user?.name}</strong>
            </span>
            <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-customer'}`}>
              {user?.role}
            </span>
            <button className="btn btn-danger" onClick={handleLogout} style={{ padding: '0.5rem' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="app-container">
        {/* Alerts Banner */}
        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            <XCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= ADMIN VIEW ================= */}
        {isAdminTab && user?.role === 'admin' ? (
          <div className="admin-layout">
            <div className="admin-header-row">
              <div className="admin-title-area">
                <SlidersHorizontal size={24} className="text-primary" />
                <h2>Administrative Management</h2>
              </div>
              <div className="admin-tab-nav">
                <button 
                  className={`tab-btn ${adminSubTab === 'bookings' ? 'active' : ''}`}
                  onClick={() => setAdminSubTab('bookings')}
                >
                  Manage Bookings
                </button>
                <button 
                  className={`tab-btn ${adminSubTab === 'tables' ? 'active' : ''}`}
                  onClick={() => setAdminSubTab('tables')}
                >
                  Manage Tables
                </button>
              </div>
            </div>

            {adminSubTab === 'bookings' ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3>All Guest Reservations</h3>
                  <div className="filter-bar">
                    <span>Filter by Date:</span>
                    <input 
                      type="date"
                      className="form-control"
                      value={adminFilterDate}
                      onChange={handleAdminFilterChange}
                      style={{ width: '160px', padding: '0.4rem 0.8rem' }}
                    />
                    {adminFilterDate && (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => { setAdminFilterDate(''); fetchAllReservations(); }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        Clear
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => fetchAllReservations(adminFilterDate)}
                      style={{ padding: '0.4rem' }}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {allReservations.length === 0 ? (
                  <div className="empty-state">
                    <Calendar className="empty-state-icon" />
                    <p>No reservations found {adminFilterDate ? `on ${adminFilterDate}` : 'yet'}.</p>
                  </div>
                ) : (
                  <div className="bookings-list">
                    {allReservations.map((res) => (
                      <div key={res._id} className="booking-item" style={editingReservation?._id === res._id ? { flexDirection: 'column', alignItems: 'stretch' } : {}}>
                        {editingReservation?._id === res._id ? (
                          <form onSubmit={handleSaveEdit} style={{ width: '100%' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
                              Edit Booking for {res.user?.name || 'Guest'}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</label>
                                <input 
                                  type="date" 
                                  className="form-control" 
                                  value={editDate} 
                                  onChange={(e) => setEditDate(e.target.value)} 
                                  required 
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time Slot</label>
                                <select 
                                  className="form-control" 
                                  value={editTimeSlot} 
                                  onChange={(e) => setEditTimeSlot(e.target.value)}
                                >
                                  {slots.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Guests</label>
                                <input 
                                  type="number" 
                                  className="form-control" 
                                  min={1} 
                                  value={editGuests} 
                                  onChange={(e) => setEditGuests(parseInt(e.target.value) || 1)} 
                                  required 
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Table</label>
                                <select 
                                  className="form-control" 
                                  value={editTableId} 
                                  onChange={(e) => setEditTableId(e.target.value)}
                                >
                                  {tables.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {t.tableNumber} (Cap: {t.capacity})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                Save Changes
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={() => setEditingReservation(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="booking-details">
                              <h4>{res.user?.name || 'Guest User'}</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                {res.user?.email}
                              </p>
                              <div className="booking-meta">
                                <span className="booking-meta-item">
                                  <Calendar size={14} /> {res.date}
                                </span>
                                <span className="booking-meta-item">
                                  <Clock size={14} /> {res.timeSlot}
                                </span>
                                <span className="booking-meta-item">
                                  <Users size={14} /> {res.guests} Guests
                                </span>
                                <span className="booking-meta-item" style={{ fontWeight: 'bold' }}>
                                  🪑 {res.table?.tableNumber || 'Table Assigned'}
                                </span>
                              </div>
                            </div>

                            <div className="booking-actions">
                              <span className={`status-indicator status-${res.status}`}>
                                {res.status}
                              </span>
                              <div className="admin-action-row">
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleStartEdit(res)}
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', marginRight: '0.5rem' }}
                                >
                                  Edit Details
                                </button>
                                {res.status === 'confirmed' ? (
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handleCancelReservation(res._id)}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                  >
                                    Cancel Booking
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdateStatus(res._id, 'confirmed')}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--color-primary)', boxShadow: 'none' }}
                                  >
                                    Confirm Booking
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Manage Tables view */
              <div className="dashboard-grid">
                {/* Left side: Add Table or Edit Table */}
                <div className="card">
                  {editingTable ? (
                    <>
                      <h3>Edit Table: {editingTable.tableNumber}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        Modify details or toggle active/inactive status.
                      </p>
                      <form onSubmit={handleSaveEditTable}>
                        <div className="form-group">
                          <label>Table Number / Name</label>
                          <input 
                            type="text"
                            className="form-control"
                            value={editTableNumber}
                            onChange={(e) => setEditTableNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Seating Capacity</label>
                          <input 
                            type="number"
                            className="form-control"
                            value={editTableCapacity}
                            onChange={(e) => setEditTableCapacity(e.target.value)}
                            min={1}
                            max={20}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                          <input 
                            type="checkbox"
                            id="editTableActive"
                            checked={editTableActive}
                            onChange={(e) => setEditTableActive(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label htmlFor="editTableActive" style={{ marginBottom: 0, cursor: 'pointer' }}>Active (Show in booking screen)</label>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.6rem' }}>
                            Save Table
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => setEditingTable(null)} style={{ flex: 1, padding: '0.6rem' }}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <>
                      <h3>Add Restaurant Table</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        Introduce a new table with custom seating capacities.
                      </p>
                      <form onSubmit={handleCreateTable}>
                        <div className="form-group">
                          <label>Table Identification</label>
                          <input 
                            type="text"
                            className="form-control"
                            placeholder="e.g. Table 9 (4 Seats)"
                            value={newTableNum}
                            onChange={(e) => setNewTableNum(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Seating Capacity</label>
                          <input 
                            type="number"
                            className="form-control"
                            value={newTableCap}
                            onChange={(e) => setNewTableCap(e.target.value)}
                            min={1}
                            max={20}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                          <Plus size={16} /> Create Table
                        </button>
                      </form>
                    </>
                  )}
                </div>

                {/* Right side: Table utilization lists */}
                <div className="card">
                  <h3>Restaurant Table Seating Layout</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Select a table below to edit its configuration or toggle active/inactive status.
                  </p>
                  <div className="tables-grid">
                    {tables.map((t) => {
                      const isSelected = editingTable?._id === t._id;
                      return (
                        <div 
                          key={t._id} 
                          className={`table-select-card ${isSelected ? 'selected' : ''} ${!t.isActive ? 'occupied' : ''}`} 
                          onClick={() => handleStartEditTable(t)}
                          style={{
                            minHeight: '140px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '1.25rem 0.5rem 0.75rem'
                          }}
                        >
                          <div style={{
                            position: 'relative',
                            width: '74px',
                            height: '74px',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: t.capacity <= 3 ? '40px' : '50px',
                              height: t.capacity <= 3 ? '40px' : '40px',
                              borderRadius: t.capacity <= 3 ? '50%' : '6px',
                              backgroundColor: isSelected ? 'var(--color-primary-glow)' : 'var(--bg-main)',
                              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              transition: 'all 0.3s ease',
                              boxShadow: isSelected ? '0 0 12px var(--color-primary-glow)' : 'none',
                              color: isSelected ? 'var(--color-primary)' : 'var(--text-main)',
                              zIndex: 2
                            }}>
                              {t.isActive ? t.capacity : '🚫'}
                            </div>
                            {renderChairs(t.capacity, !t.isActive, isSelected)}
                          </div>
                          <span className="table-num" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.tableNumber}</span>
                          <span className="table-cap" style={{ fontSize: '0.7rem' }}>
                            {t.isActive ? `Capacity: ${t.capacity}` : 'Inactive'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= CUSTOMER VIEW ================= */
          <div className="dashboard-grid">
            {/* Left Column: Create Reservation */}
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Book a Table</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Select date, time slot, guest size, and tap your desired table from the availability grid.
              </p>

              <form onSubmit={handleCreateReservation}>
                {/* Date Input */}
                <div className="form-group">
                  <label htmlFor="resDate">1. Choose Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar 
                      size={18} 
                      style={{ 
                        position: 'absolute', 
                        left: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: 'var(--text-muted)' 
                      }} 
                    />
                    <input
                      type="date"
                      id="resDate"
                      className="form-control"
                      value={date}
                      min={new Date().toISOString().split('T')[0]} // Prevents booking in past
                      onChange={(e) => setDate(e.target.value)}
                      style={{ paddingLeft: '2.5rem' }}
                      required
                    />
                  </div>
                </div>

                {/* Time Slots Selection */}
                <div className="form-group">
                  <label>2. Choose Time Slot</label>
                  <div className="slots-container">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`slot-btn ${timeSlot === slot ? 'selected' : ''}`}
                        onClick={() => setTimeSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guests Size */}
                <div className="form-group">
                  <label htmlFor="resGuests">3. Number of Guests</label>
                  <div style={{ position: 'relative' }}>
                    <Users 
                      size={18} 
                      style={{ 
                        position: 'absolute', 
                        left: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: 'var(--text-muted)' 
                      }} 
                    />
                    <input
                      type="number"
                      id="resGuests"
                      className="form-control"
                      value={guests}
                      min={1}
                      max={12}
                      onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                      style={{ paddingLeft: '2.5rem' }}
                      required
                    />
                  </div>
                </div>

                {/* Interactive Table Selection Layout */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>4. Select Your Table</label>
                  {tables.length === 0 ? (
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>Loading tables...</p>
                  ) : (
                    <div className="tables-grid">
                      {tables.map((t) => {
                        const isOccupied = occupiedTableIds.includes(t._id);
                        const isSelected = selectedTable?._id === t._id;
                        const isUnderCapacity = t.capacity < guests;

                        return (
                          <div
                            key={t._id}
                            className={`table-select-card 
                              ${isSelected ? 'selected' : ''} 
                              ${isOccupied ? 'occupied' : ''}
                            `}
                            onClick={() => {
                              if (isOccupied) return;
                              setSelectedTable(t);
                            }}
                            style={{
                              ...(isUnderCapacity ? { borderColor: 'rgba(166, 159, 149, 0.3)', opacity: 0.8 } : {}),
                              minHeight: '140px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: '1.25rem 0.5rem 0.75rem'
                            }}
                          >
                            {/* Animated Physical Table & Chairs Representation */}
                            <div style={{
                              position: 'relative',
                              width: '74px',
                              height: '74px',
                              marginBottom: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {/* Physical Table Top */}
                              <div style={{
                                width: t.capacity <= 3 ? '40px' : '50px',
                                height: t.capacity <= 3 ? '40px' : '40px',
                                borderRadius: t.capacity <= 3 ? '50%' : '6px',
                                backgroundColor: isSelected ? 'var(--color-primary-glow)' : 'var(--bg-main)',
                                border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                boxShadow: isSelected ? '0 0 12px var(--color-primary-glow)' : 'none',
                                color: isSelected ? 'var(--color-primary)' : 'var(--text-main)',
                                zIndex: 2
                              }}>
                                {isOccupied ? '❌' : isSelected ? '✓' : t.capacity}
                              </div>
                              {/* Chairs */}
                              {renderChairs(t.capacity, isOccupied, isSelected)}
                            </div>
                            <span className="table-num" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.tableNumber}</span>
                            {isUnderCapacity && !isOccupied ? (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                (Cap: {t.capacity} - Too Small)
                              </span>
                            ) : (
                              <span className="table-cap" style={{ fontSize: '0.7rem' }}>Capacity: {t.capacity}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedTable && (
                  <div style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Selected: <strong>{selectedTable.tableNumber}</strong> (Capacity: {selectedTable.capacity} guests)
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  <PlusCircle size={18} /> Complete Reservation
                </button>
              </form>
            </div>

            {/* Right Column: Reservation History */}
            <div className="card">
              <h3>My Bookings</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Your upcoming and past reservations.
              </p>

              {myReservations.length === 0 ? (
                <div className="empty-state">
                  <Calendar className="empty-state-icon" />
                  <p>You haven't made any reservations yet.</p>
                </div>
              ) : (
                <div className="bookings-list">
                  {myReservations.map((res) => (
                    <div key={res._id} className="booking-item">
                      <div className="booking-details">
                        <h4>{res.table?.tableNumber || 'Table Reserved'}</h4>
                        <div className="booking-meta">
                          <span className="booking-meta-item">
                            <Calendar size={14} /> {res.date}
                          </span>
                          <span className="booking-meta-item">
                            <Clock size={14} /> {res.timeSlot}
                          </span>
                          <span className="booking-meta-item">
                            <Users size={14} /> {res.guests} Guests
                          </span>
                        </div>
                      </div>

                      <div className="booking-actions">
                        <span className={`status-indicator status-${res.status}`}>
                          {res.status}
                        </span>
                        {res.status === 'confirmed' && (
                          <button
                            className="btn btn-secondary btn-danger"
                            onClick={() => handleCancelReservation(res._id)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
