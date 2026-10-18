import React, { useState } from 'react';

function PerformanceReport({ user }) {
    // รายการเดือนภาษาไทย
    const monthsList = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    // สร้างรายการปี พ.ศ. (ย้อนหลัง 2 ปี ถึงอนาคต 2 ปี)
    const currentYearBE = new Date().getFullYear() + 543;
    const yearsList = [currentYearBE - 2, currentYearBE - 1, currentYearBE, currentYearBE + 1, currentYearBE + 2];

    // State สำหรับฟอร์มกรอกข้อมูลบันทึกผลการปฏิบัติหน้าที่
    const [formData, setFormData] = useState({
        month: '',
        year: String(currentYearBE),
        date_of_duty: new Date().toISOString().split('T')[0], // วันที่ปัจจุบันรูปแบบ YYYY-MM-DD
        time_of_duty: '00:00',
        duty_side: '',
        duty_result: '',
        // ข้อมูลผู้รับทราบ/รับรองผลการปฏิบัติ
        supervisor_prefix: 'นาย',
        supervisor_first_name: '',
        supervisor_last_name: '',
        supervisor_position: 'ผู้ใหญ่บ้าน',
        images: [] // เก็บไฟล์รูปภาพสูงสุด 6 รูป
    });

    // จัดการเมื่อเลือกรูปภาพ (รองรับสูงสุด 6 รูป)
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + formData.images.length > 6) {
            alert('สามารถอัปโหลดรูปภาพได้สูงสุดไม่เกิน 6 รูป');
            return;
        }
        const newImages = files.map(file => URL.createObjectURL(file));
        setFormData({ ...formData, images: [...formData.images, ...newImages] });
    };

    // ฟังก์ชันลบรูปภาพที่เลือกออก
    const handleRemoveImage = (indexToRemove) => {
        setFormData({
            ...formData,
            images: formData.images.filter((_, index) => index !== indexToRemove)
        });
    };
    

    // ฟังก์ชันกดสั่งพิมพ์ / ดาวน์โหลด PDF พร้อมตั้งชื่อไฟล์อัตโนมัติ
    const handlePrint = () => {
        // ดึงข้อมูลสำหรับตั้งชื่อไฟล์: ชื่อ_นามสกุล_หมู่ที่_วัน/เดือน/ปี
        const prefix = user?.prefix || '';
        const firstName = user?.first_name || 'ไม่ระบุชื่อ';
        const lastName = user?.last_name || '';
        const moo = user?.moo ? `หมู่ที่${user.moo}` : '';
        
        // แปลงวันที่จากรูปแบบ YYYY-MM-DD เป็น DD-MM-YYYY (หรือรูปแบบที่ต้องการเพื่อไม่ให้ติดเครื่องหมาย / ที่อาจทำให้ตั้งชื่อไฟล์ไม่ได้ในบาง OS)
        const dateFormatted = formData.date_of_duty ? formData.date_of_duty.split('-').reverse().join('-') : 'วันที่ไม่ระบุ';

        // จัดรูปแบบชื่อไฟล์: นาย_เข้ม_ศรีอมรรัตน์_หมู่ที่14_14-10-2026
        const fileName = `${prefix}${firstName}_${lastName}_${moo}_${dateFormatted}`.replace(/\s+/g, '_');

        // บันทึกชื่อ Title เดิมเก็บไว้
        const originalTitle = document.title;

        // เปลี่ยน Title ของหน้าเว็บให้เป็นชื่อไฟล์ที่ต้องการ (เบราว์เซอร์จะนำไปตั้งเป็นชื่อ PDF อัตโนมัติเวลา Save)
        document.title = fileName;

        // สั่งพิมพ์
        window.print();

        // คืนค่า Title กลับเป็นปกติหลังจากพิมพ์เสร็จ
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    return (
        <div style={{ fontFamily: 'TH Sarabun PSK, TH SarabunNew, sans-serif' }}>

            {/* 1. ส่วนหน้าจอสำหรับกรอกข้อมูล (ซ่อนเวลาสั่ง Print ออกเอกสาร PDF) */}
            <div className="no-print" style={{ background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h2 style={{ marginTop: 0, color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
                    กรอกข้อมูลบันทึกผลการปฏิบัติหน้าที่
                </h2>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    ระบบดึงข้อมูลส่วนตัว (ชื่อ-นามสกุล, ตำแหน่ง, ที่อยู่) ของคุณจากฐานข้อมูลให้อัตโนมัติ กรุณากรอกรายละเอียดด้านล่างให้ครบถ้วน
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    {/* 1. ประจำเดือน (Dropdown) */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ประจำเดือน:</label>
                        <select
                            value={formData.month}
                            onChange={e => setFormData({ ...formData, month: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    {/* 1. พ.ศ. (Dropdown) */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>พ.ศ.:</label>
                        <select
                            value={formData.year}
                            onChange={e => setFormData({ ...formData, year: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* 2. วันที่ปฏิบัติหน้าที่ (Datepicker) */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>วันที่ปฏิบัติหน้าที่:</label>
                        <input
                            type="date"
                            value={formData.date_of_duty}
                            onChange={e => setFormData({ ...formData, date_of_duty: e.target.value })}
                            style={{ width: '100%', padding: '9px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* 3. เวลา (น.) (Time Input) */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>เวลา (น.):</label>
                        <input
                            type="time"
                            value={formData.time_of_duty}
                            onChange={e => setFormData({ ...formData, time_of_duty: e.target.value })}
                            style={{ width: '100%', padding: '9px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ปฏิบัติหน้าที่ในด้าน:</label>
                    <input
                        type="text"
                        value={formData.duty_side}
                        onChange={e => setFormData({ ...formData, duty_side: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ผลการปฏิบัติ:</label>
                    <textarea
                        value={formData.duty_result}
                        onChange={e => setFormData({ ...formData, duty_result: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', height: '80px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* 4. ข้อมูลผู้รับทราบ/รับรองผลการปฏิบัติ */}
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #e9ecef' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>ข้อมูลผู้รับทราบ / รับรองผลการปฏิบัติ</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>คำนำหน้าชื่อ:</label>
                            <select
                                value={formData.supervisor_prefix}
                                onChange={e => setFormData({ ...formData, supervisor_prefix: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="นาย">นาย</option>
                                <option value="นาง">นาง</option>
                                <option value="นางสาว">นางสาว</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>ชื่อ:</label>
                            <input
                                type="text"
                                placeholder="ชื่อผู้รับทราบ"
                                value={formData.supervisor_first_name}
                                onChange={e => setFormData({ ...formData, supervisor_first_name: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>นามสกุล:</label>
                            <input
                                type="text"
                                placeholder="นามสกุลผู้รับทราบ"
                                value={formData.supervisor_last_name}
                                onChange={e => setFormData({ ...formData, supervisor_last_name: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>ตำแหน่ง:</label>
                                <select
                                    value={formData.supervisor_position}
                                    onChange={e => setFormData({ ...formData, supervisor_position: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                >
                                    <option value="ผู้ใหญ่บ้าน">ผู้ใหญ่บ้าน</option>
                                    <option value="กำนัน">กำนัน</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ส่วนอัปโหลดรูปภาพ */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>อัปโหลดรูปภาพหลักฐาน (เลือกได้สูงสุด 6 รูป):</label>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'block', marginTop: '5px' }}
                    />
                    <small style={{ color: '#666' }}>เลือกรูปภาพแล้วทั้งหมด: <b>{formData.images.length}</b> / 6 รูป</small>

                    {/* พรีวิวรูปภาพย่อพร้อมปุ่มลบ */}
                    {formData.images.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                            {formData.images.map((imgSrc, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}>
                                    <img src={imgSrc} alt={`preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(idx)}
                                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={handlePrint}
                    style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                >
                    🖨️ พิมพ์ / ดาวน์โหลดเอกสาร PDF (รูปแบบทางการ)
                </button>
            </div>


            {/* 2. ส่วนหน้ากระดาษ A4 สำหรับพิมพ์ PDF (โครงสร้างตามแบบฟอร์มต้นฉบับ 100%) */}

            {/* พื้นที่สร้าง PDF */}
            <div className="pdf-print-area">

                {/* หน้า 1: แบบบันทึกผลการปฏิบัติหน้าที่ */}
                <section className="pdf-container form-page">

                    <header className="form-header">
                        <h1>บันทึกผลการปฏิบัติหน้าที่ของพนักงานฝ่ายปกครอง</h1>

                        <p className="month-line">
                            ประจำเดือน {formData.month} พ.ศ. {formData.year}
                        </p>

                        <div className="officer-info">
                            <p>
                                ชื่อ {user?.prefix || 'นาย'} {user?.first_name || '...'}
                                {' '}นามสกุล {user?.last_name || '...'}
                                {' '}ตำแหน่ง {user?.position || '...'}
                                {' '}หมู่ที่ {user?.moo || '...'}
                                {' '}ตำบล {user?.subdistrict || '...'}
                            </p>
                            <p>
                                อำเภอธาตุพนม จังหวัดนครพนม
                            </p>
                        </div>
                    </header>

                    <table className="duty-table">
                        <colgroup>
                            <col style={{ width: '68%' }} />
                            <col style={{ width: '32%' }} />
                        </colgroup>

                        <thead>
                            <tr>
                                <th>รายละเอียดผลการปฏิบัติหน้าที่</th>
                                <th>ความเห็นของผู้บังคับบัญชา</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td className="duty-detail">
                                    <div>
                                        วันนี้ (วันที่ {formData.date_of_duty})
                                        เวลา {formData.time_of_duty} น.
                                    </div>

                                    <p>ข้าพเจ้าได้ปฏิบัติหน้าที่ในด้าน</p>
                                    <p className="duty-text">{formData.duty_side || '\u00A0'}</p>

                                    <p>โดยมีผลการปฏิบัติ ดังนี้</p>
                                    <p className="result-text">{formData.duty_result || '\u00A0'}</p>

                                    <p className="evidence-count">
                                        ทั้งนี้ได้แนบหลักฐาน/รูปถ่ายประกอบ จำนวน{' '}
                                        {formData.images.length} รูป
                                    </p>

                                    <div className="signature-block">
                                        <p>(ลงชื่อ)................................................ ผู้ปฏิบัติหน้าที่</p>
                                        <p>
                                            ({user?.prefix || 'นาย'} {user?.first_name || '...'}{' '}
                                            {user?.last_name || '...'})
                                        </p>
                                        <p>ตำแหน่ง {user?.position || '...'}</p>
                                    </div>

                                    <p className="certification-text">
                                        ได้ทราบผลการปฏิบัติหน้าที่แล้ว/ขอรับรองว่าผลการปฏิบัติหน้าที่
                                        ดังกล่าวข้างต้นเป็นความจริงทุกประการ
                                    </p>

                                    <div className="signature-block supervisor-sign">
                                        <p>(ลงชื่อ)........................................ ผู้รับทราบ/รับรองผลการปฏิบัติฯ</p>
                                        <p>
                                            ({formData.supervisor_prefix}{' '}
                                            {formData.supervisor_first_name}{' '}
                                            {formData.supervisor_last_name})
                                        </p>
                                        <p>ตำแหน่ง {formData.supervisor_position}</p>
                                    </div>
                                </td>

                                <td className="commander-opinion">
                                    <div className="opinion-lines">
                                        {Array.from({ length: 10 }).map((_, i) => (
                                            <div key={i}>......................................</div>
                                        ))}
                                    </div>

                                    <div className="commander-sign">
                                        <p>(ลงชื่อ) ................................</p>
                                        <p>( นายกำนัน )</p>
                                        <p>ตำแหน่ง กำนัน</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <section className="receipt-section">
                        <p>
                            หมายเหตุ กลุ่มงานบริหารงานปกครอง ที่ทำการปกครองอำเภอธาตุพนม
                            ได้รับบันทึกผลการปฏิบัติหน้าที่ดังกล่าวเรียบร้อยแล้ว
                        </p>
                        <p>เมื่อวันที่ {formData.date_of_duty}</p>

                        <div className="receipt-sign">
                            <p>(ลงชื่อ)................................................ผู้รับ</p>
                            <p>(................................................)</p>
                        </div>
                    </section>
                </section>

                {/* หน้าแสดงรูปถ่ายหลักฐาน (จัดเลย์เอาต์หน้าละ 2 รูป อัตโนมัติ รองรับสูงสุด 6 รูป) */}
                {formData.images.length > 0 && (
                    <div>
                        {Array.from({ length: Math.ceil(formData.images.length / 2) }).map((_, pageIndex) => (
                            <section className="pdf-container evidence-page" key={`evidence-page-${pageIndex}`}>
                                <h2>รูปภาพการปฏิบัติหน้าที่</h2>

                                <div className="evidence-grid">
                                    {formData.images.slice(pageIndex * 2, (pageIndex + 1) * 2).map((src, i) => {
                                        const imageNumber = pageIndex * 2 + i + 1;
                                        return (
                                            <figure className="evidence-item" key={`evidence-item-${imageNumber}`}>
                                                <img src={src} alt={`หลักฐาน ${imageNumber}`} />
                                                <figcaption>ภาพที่ {imageNumber}</figcaption>
                                                <br></br>
                                            </figure>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PerformanceReport;