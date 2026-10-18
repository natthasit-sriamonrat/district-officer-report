import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import PerformanceReport from './PerformanceReport';

function App() {
  const [idCard, setIdCard] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  // State สำหรับควบคุมหน้าจอของ User ทั่วไป ('profile' = หน้าหลัก, 'form' = หน้ากรอกบันทึกผลฯ)
  const [userView, setUserView] = useState('profile');
  
  // State สำหรับ Admin Dashboard
  const [usersList, setUsersList] = useState([]);
  const [form, setForm] = useState({
    id_card: '', prefix: 'นาย', first_name: '', last_name: '', birth_date: '', 
    moo: '', subdistrict: '', district: '', province: '', 
    position: '', status: 'ACTIVE', role: 'user'
  });

  const [editingUserId, setEditingUserId] = useState(null);

  // ฟังก์ชัน Login ด้วยเลข 13 หลัก
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      //const res = await axios.post('http://localhost:5000/api/login', { id_card: idCard });
      const res = await axios.post('http://postgresql://postgres:[9tLQN6K8apoQw4IQ]@db.nnpdtpvawumcipzqevvf.supabase.co:5432/postgres/api/login', { id_card: idCard });
      if (res.data.success) {
        setUser(res.data.user);
        if (res.data.user.role === 'admin') {
          fetchUsers();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

  // ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับ Admin)
  const fetchUsers = async () => {
    try {
      //const res = await axios.get('http://localhost:5000/api/admin/users');
      const res = await axios.get('http://postgresql://postgres:[9tLQN6K8apoQw4IQ]@db.nnpdtpvawumcipzqevvf.supabase.co:5432/postgres/api/admin/users');
      setUsersList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Admin เพิ่ม หรือ แก้ไข ผู้ใช้งาน (Create / Update)
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        //const res = await axios.put(`http://localhost:5000/api/admin/users/${editingUserId}`, form);
        const res = await axios.put(`http://postgresql://postgres:[9tLQN6K8apoQw4IQ]@db.nnpdtpvawumcipzqevvf.supabase.co:5432/postgres/api/admin/users/${editingUserId}`, form);
        if (res.data.success) {
          alert('อัปเดตข้อมูลผู้ใช้งานสำเร็จ');
          setEditingUserId(null);
        }
      } else {
        //const res = await axios.post('http://localhost:5000/api/admin/users', form);
        const res = await axios.post('http://postgresql://postgres:[9tLQN6K8apoQw4IQ]@db.nnpdtpvawumcipzqevvf.supabase.co:5432/postgres/api/admin/users', form);
        if (res.data.success) {
          alert('เพิ่มผู้ใช้งานสำเร็จ');
        }
      }

      setForm({ 
        id_card: '', prefix: 'นาย', first_name: '', last_name: '', birth_date: '', 
        moo: '', subdistrict: '', district: '', province: '', 
        position: '', status: 'ACTIVE', role: 'user' 
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleEditClick = (u) => {
    setEditingUserId(u.user_id);
    setForm({
      id_card: u.id_card,
      prefix: u.prefix,
      first_name: u.first_name,
      last_name: u.last_name,
      birth_date: u.birth_date ? u.birth_date.split('T')[0] : '',
      moo: u.moo || '',
      subdistrict: u.subdistrict,
      district: u.district,
      province: u.province,
      position: u.position,
      status: u.status,
      role: u.role
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setForm({ 
      id_card: '', prefix: 'นาย', first_name: '', last_name: '', birth_date: '', 
      moo: '', subdistrict: '', district: '', province: '', 
      position: '', status: 'ACTIVE', role: 'user' 
    });
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่?')) {
      try {
        //const res = await axios.delete(`http://localhost:5000/api/admin/users/${userId}`);
        const res = await axios.delete(`http://postgresql://postgres:[9tLQN6K8apoQw4IQ]@db.nnpdtpvawumcipzqevvf.supabase.co:5432/postgres/api/admin/users/${userId}`);
        if (res.data.success) {
          alert('ลบผู้ใช้งานสำเร็จ');
          fetchUsers();
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };

  // Inline CSS Styles สำหรับ Responsive (รองรับมือถือและแท็บเล็ต)
  const styles = {
    container: {
      padding: '15px',
      fontFamily: 'sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      boxSizing: 'border-box',
    },
    card: {
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      marginBottom: '20px',
      boxSizing: 'border-box',
    },
    gridForm: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px',
      marginTop: '15px',
    },
    input: {
      width: '100%',
      padding: '10px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      boxSizing: 'border-box',
      fontSize: '14px',
    },
    button: {
      padding: '10px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px',
    },
    tableWrapper: {
      width: '100%',
      overflowX: 'auto', // ทำให้ตารางเลื่อนซ้าย-ขวาได้บนมือถือจอเล็ก
      WebkitOverflowScrolling: 'touch',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '10px',
      minWidth: '700px', // ป้องกันบีบตัวจนเละบนจอเล็ก
    },
    th: {
      padding: '10px',
      border: '1px solid #ddd',
      background: '#f1f1f1',
      fontSize: '13px',
      textAlign: 'left',
    },
    td: {
      padding: '10px',
      border: '1px solid #ddd',
      fontSize: '13px',
    },
    formNavButton: {
      width: '100%',
      padding: '12px',
      background: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '15px',
      marginBottom: '10px',
      boxSizing: 'border-box',
    },
    backButton: {
      marginBottom: '20px',
      padding: '8px 15px',
      background: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
    }
  };

  // หน้าจอ Login
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5', padding: '15px', boxSizing: 'border-box' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>เข้าสู่ระบบ</h2>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>เลขบัตรประจำตัวประชาชน 13 หลัก</label>
            <input 
              type="text" 
              maxLength="13" 
              value={idCard} 
              onChange={(e) => setIdCard(e.target.value)} 
              placeholder="กรอกเลข 13 หลัก" 
              style={styles.input}
              required 
            />
          </div>
          {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>{error}</p>}
          <button type="submit" style={{ ...styles.button, width: '100%', background: '#007bff', color: 'white' }}>
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  // หน้าจอสำหรับ Admin (Responsive CRUD Dashboard)
  if (user.role === 'admin') {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', margin: 0 }}>Admin Dashboard</h2>
          <button onClick={() => setUser(null)} style={{ ...styles.button, background: '#dc3545', color: 'white' }}>ออกจากระบบ</button>
        </div>

        {/* ฟอร์มเพิ่ม / แก้ไข ผู้ใช้งาน */}
        <div style={{ ...styles.card, border: editingUserId ? '2px solid #ffc107' : 'none' }}>
          <h3>{editingUserId ? `แก้ไขข้อมูลผู้ใช้ (ID: ${editingUserId})` : 'เพิ่มผู้ใช้งานใหม่ (Create)'}</h3>
          <form onSubmit={handleSubmitUser}>
            <div style={styles.gridForm}>
              <input type="text" placeholder="เลขบัตร 13 หลัก" maxLength="13" value={form.id_card} onChange={e => setForm({...form, id_card: e.target.value})} required style={styles.input} />
              <select value={form.prefix} onChange={e => setForm({...form, prefix: e.target.value})} style={styles.input}>
                <option value="นาย">นาย</option>
                <option value="นาง">นาง</option>
                <option value="นางสาว">นางสาว</option>
              </select>
              <input type="text" placeholder="ชื่อ" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required style={styles.input} />
              <input type="text" placeholder="นามสกุล" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required style={styles.input} />
              <input type="date" value={form.birth_date} onChange={e => setForm({...form, birth_date: e.target.value})} required style={styles.input} />
              
              <input type="text" placeholder="หมู่ (เช่น หมู่ 1 หรือ -)" value={form.moo} onChange={e => setForm({...form, moo: e.target.value})} style={styles.input} />
              <input type="text" placeholder="ตำบล" value={form.subdistrict} onChange={e => setForm({...form, subdistrict: e.target.value})} required style={styles.input} />
              <input type="text" placeholder="อำเภอ" value={form.district} onChange={e => setForm({...form, district: e.target.value})} required style={styles.input} />
              <input type="text" placeholder="จังหวัด" value={form.province} onChange={e => setForm({...form, province: e.target.value})} required style={styles.input} />

              <input type="text" placeholder="ตำแหน่ง" value={form.position} onChange={e => setForm({...form, position: e.target.value})} required style={styles.input} />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={styles.input}>
                <option value="ACTIVE">ยังทำงานอยู่ (ACTIVE)</option>
                <option value="INACTIVE">ไม่ได้ทำงานแล้ว (INACTIVE)</option>
              </select>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={styles.input}>
                <option value="user">User (ผู้ใช้ทั่วไป)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>
            
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="submit" style={{ ...styles.button, background: editingUserId ? '#ffc107' : '#28a745', color: editingUserId ? '#000' : '#fff' }}>
                {editingUserId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลผู้ใช้'}
              </button>
              {editingUserId && (
                <button type="button" onClick={handleCancelEdit} style={{ ...styles.button, background: '#6c757d', color: 'white' }}>
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ตารางแสดงรายชื่อผู้ใช้ทั้งหมด */}
        <div style={styles.card}>
          <h3>รายชื่อผู้ใช้งานทั้งหมดในระบบ</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>เลข 13 หลัก</th>
                  <th style={styles.th}>ชื่อ-นามสกุล</th>
                  <th style={styles.th}>ที่อยู่</th>
                  <th style={styles.th}>ตำแหน่ง</th>
                  <th style={styles.th}>สถานะ</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.user_id}>
                    <td style={styles.td}>{u.user_id}</td>
                    <td style={styles.td}>{u.id_card}</td>
                    <td style={styles.td}>{u.prefix} {u.first_name} {u.last_name}</td>
                    <td style={styles.td}>หมู่ {u.moo || '-'} ต.{u.subdistrict} อ.{u.district} จ.{u.province}</td>
                    <td style={styles.td}>{u.position}</td>
                    <td style={styles.td}>
                      <span style={{ color: u.status === 'ACTIVE' ? 'green' : 'red', fontWeight: 'bold' }}>
                        {u.status === 'ACTIVE' ? 'ยังทำงานอยู่' : 'ไม่ได้ทำงานแล้ว'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleEditClick(u)} style={{ ...styles.button, padding: '5px 10px', background: '#ffc107', marginRight: '5px', fontSize: '12px' }}>
                        แก้ไข
                      </button>
                      <button onClick={() => handleDeleteUser(u.user_id)} style={{ ...styles.button, padding: '5px 10px', background: '#dc3545', color: 'white', fontSize: '12px' }}>
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // หน้าจอสำหรับ User ทั่วไป
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto', boxSizing: 'border-box' }}>
      
      {userView === 'form' ? (
        <div>
          {/* ครอบด้วย className="no-print" เพื่อซ่อนตอนกดพิมพ์ PDF */}
          <div className="no-print">
            <button onClick={() => setUserView('profile')} style={styles.backButton}>
              ← กลับสู่หน้าข้อมูลส่วนตัว
            </button>
          </div>
          <PerformanceReport user={user} />
        </div>
      ) : (
        <div style={styles.card}>
          <h2>ข้อมูลส่วนตัวผู้ใช้งาน</h2>
          <hr style={{ margin: '15px 0' }} />
          <p><strong>รหัสผู้ใช้:</strong> {user.user_id}</p>
          <p><strong>เลขบัตรประชาชน:</strong> {user.id_card}</p>
          <p><strong>ชื่อ-นามสกุล:</strong> {user.fullname || `${user.prefix} ${user.first_name} ${user.last_name}`}</p>
          <p><strong>ที่อยู่:</strong> หมู่ {user.moo || '-'} ต.{user.subdistrict} อ.{user.district} จ.{user.province}</p>
          <p><strong>ตำแหน่ง:</strong> {user.position}</p>
          <p><strong>สถานะการทำงาน:</strong> <span style={{ color: user.status === 'ACTIVE' ? 'green' : 'red', fontWeight: 'bold' }}>{user.status === 'ACTIVE' ? 'ยังทำงานอยู่' : 'ไม่ได้ทำงานแล้ว'}</span></p>
          
          <hr style={{ margin: '20px 0' }} />

          {/* ปุ่มกรอกข้อมูลบันทึกผลการปฏิบัติหน้าที่ อยู่เหนือปุ่มออกจากระบบ */}
          <button 
            onClick={() => setUserView('form')} 
            style={styles.formNavButton}
          >
            📋 กรอกข้อมูลบันทึกผลการปฏิบัติหน้าที่
          </button>

          <button onClick={() => setUser(null)} style={{ ...styles.button, background: '#dc3545', color: 'white', width: '100%' }}>
            ออกจากระบบ
          </button>
        </div>
      )}

    </div>
  );
}

export default App;