const DBKEY = 'aljuman_lab_v1';

const defaultTests = [
  ['CBC','Hematology','','See laboratory reference'],
  ['Hemoglobin','Hematology','g/dL','Male 13.5-17.5 | Female 12.0-15.5'],
  ['WBC','Hematology','10^3/µL','4.0-11.0'],
  ['Platelets','Hematology','10^3/µL','150-400'],
  ['Glucose','Biochemistry','mg/dL','70-110'],
  ['Urea','Biochemistry','mg/dL','15-45'],
  ['Creatinine','Biochemistry','mg/dL','Male 0.7-1.3 | Female 0.6-1.1'],
  ['ALT','Biochemistry','U/L','7-56'],
  ['AST','Biochemistry','U/L','10-40'],
  ['TSH','Hormones','µIU/mL','0.4-4.0'],
  ['Vitamin D','Hormones','ng/mL','30-100'],
  ['CRP','Immunology & Serology','mg/L','<5'],
  ['Troponin I','Cardiac Markers','ng/mL','According to assay'],
  ['Urine Analysis','Urine Analysis','','See report']
].map(([name,category,unit,range])=>({
  name,category,unit,range
}));

function fresh(){
  return {
    patients:[],
    reports:[],
    tests:defaultTests.map(x=>({...x})),
    settings:{
      labAr:'مختبر الجمان الجانبي',
      labEn:'Al-Juman Al-Janabi Laboratory',
      phone:'07831216789',
      address:'الصقلاوية - الشهداء الثانية'
    },
    pseq:1,
    rseq:1
  };
}

let db;

try {
  const oldData=JSON.parse(localStorage.getItem(DBKEY)||'{}');
  db={...fresh(),...oldData};
  db.settings={...fresh().settings,...(oldData.settings||{})};
  db.patients=db.patients||[];
  db.reports=db.reports||[];
  db.tests=db.tests||defaultTests.map(x=>({...x}));
} catch {
  db=fresh();
}

let page='home';

const $=s=>document.querySelector(s);
const content=$('#content');

function save(){
  localStorage.setItem(DBKEY,JSON.stringify(db));
}

function esc(s=''){
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function today(){
  return new Date().toISOString().slice(0,10);
}

function seq(n){
  return new Date().getFullYear()+'-'+String(n).padStart(4,'0');
}

/* Navigation */

document.querySelectorAll('nav [data-page]').forEach(b=>{
  b.onclick=()=>{
    page=b.dataset.page;
    render();
  };
});

if($('#backup')){
  $('#backup').onclick=backup;
}

function render(){
  if(page==='home') home();
  if(page==='new') newPatient();
  if(page==='patients') patients();
  if(page==='tests') testsPage();
  if(page==='stats') stats();
  if(page==='settings') settingsPage();
}

function setPage(p){
  page=p;
  render();
}

/* HOME */

function home(){
  content.innerHTML=`
    <h1 class="title">لوحة الرئيسية</h1>

    <div class="cards">
      <div class="card">
        إجمالي المرضى
        <div class="metric">${db.patients.length}</div>
      </div>

      <div class="card">
        إجمالي التقارير
        <div class="metric">${db.reports.length}</div>
      </div>

      <div class="card">
        عدد التحاليل
        <div class="metric">${db.tests.length}</div>
      </div>

      <div class="card">
        تقارير اليوم
        <div class="metric">
          ${db.reports.filter(x=>x.date===today()).length}
        </div>
      </div>
    </div>

    <div class="panel">
      <h2>إجراءات سريعة</h2>

      <div class="actions">
        <button onclick="setPage('new')">
          + إضافة مريض جديد
        </button>

        <button class="secondary" onclick="setPage('patients')">
          عرض السجلات
        </button>

        <button class="secondary" onclick="setPage('tests')">
          إدارة التحاليل
        </button>
      </div>
    </div>

    <div class="panel">
      <h2>آخر التقارير</h2>
      ${recent()}
    </div>
  `;
}

/* NEW PATIENT */

function newPatient(){
  content.innerHTML=`
    <h1 class="title">تسجيل مريض / زيارة</h1>

    <div class="panel">
      <form id="pf">

        <div class="grid">

          <div class="field">
            <label>اسم المريض *</label>
            <input name="name" required>
          </div>

          <div class="field">
            <label>العمر</label>

            <div style="display:flex;gap:6px">
              <input name="age" type="number" min="0">

              <select name="ageUnit">
                <option>Years</option>
                <option>Months</option>
                <option>Days</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label>الجنس</label>

            <select name="gender">
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>

          <div class="field">
            <label>تاريخ التحليل</label>
            <input name="date" type="date" value="${today()}">
          </div>

          <div class="field">
            <label>اسم الطبيب</label>
            <input name="doctor">
          </div>

          <div class="field">
            <label>ملاحظات</label>
            <textarea name="notes"></textarea>
          </div>

        </div>

        <div class="actions">
          <button type="submit">
            حفظ واختيار التحاليل
          </button>

          <button
            type="button"
            class="secondary"
            onclick="setPage('home')">
            إلغاء
          </button>
        </div>

      </form>
    </div>
  `;

  $('#pf').onsubmit=e=>{
    e.preventDefault();

    const f=new FormData(e.target);

    const p={
      id:seq(db.pseq++),
      name:f.get('name'),
      age:f.get('age')||'',
      ageUnit:f.get('ageUnit'),
      gender:f.get('gender'),
      date:f.get('date'),
      doctor:f.get('doctor'),
      notes:f.get('notes'),
      reports:[]
    };

    db.patients.unshift(p);

    save();

    chooseTests(p.id);
  };
}

/* TEST SELECTION - MOBILE FIX */

function chooseTests(pid){
  const p=db.patients.find(x=>x.id===pid);

  if(!p){
    alert('لم يتم العثور على المريض');
    setPage('patients');
    return;
  }

  let chosen=[];

  content.innerHTML=`
    <h1 class="title">
      اختيار التحاليل
    </h1>

    <div class="panel">

      <div class="card">
        <strong>المريض:</strong>
        ${esc(p.name)}
        <br>
        <strong>Patient ID:</strong>
        ${esc(p.id)}
      </div>

      <div style="margin-top:12px">
        <input
          id="ts"
          class="search"
          type="search"
          placeholder="ابحث عن تحليل..."
        >
      </div>

      <div class="actions">
        <button type="button" class="secondary" id="selectAll">
          تحديد الكل
        </button>

        <button type="button" class="secondary" id="clearAll">
          إلغاء تحديد الكل
        </button>
      </div>

      <div id="testChoices"></div>

      <div class="card" style="margin-top:12px">
        التحاليل المحددة:
        <strong id="selectedCount">0</strong>
      </div>

      <div class="actions">
        <button type="button" id="nextReport">
          متابعة إدخال النتائج
        </button>

        <button
          type="button"
          class="secondary"
          onclick="setPage('patients')">
          حفظ والرجوع
        </button>
      </div>

    </div>
  `;

  const choices=$('#testChoices');
  const search=$('#ts');
  const count=$('#selectedCount');

  function updateCount(){
    count.textContent=chosen.length;
  }

  function fill(){
    const q=search.value.trim().toLowerCase();

    const filtered=db.tests.filter(t=>
      t.name.toLowerCase().includes(q)||
      (t.category||'').toLowerCase().includes(q)
    );

    choices.innerHTML=`
      <div class="cards" style="margin-top:12px">
        ${filtered.map(t=>{
          const isChecked=chosen.includes(t.name);

          return `
            <label
              class="card"
              style="
                display:flex;
                align-items:center;
                gap:12px;
                cursor:pointer;
                min-height:65px;
              "
            >

              <input
                type="checkbox"
                class="test-checkbox"
                value="${esc(t.name)}"
                ${isChecked?'checked':''}
                style="
                  width:22px;
                  height:22px;
                  min-width:22px;
                  cursor:pointer;
                "
              >

              <span style="flex:1">
                <strong>${esc(t.name)}</strong>

                <small style="display:block;margin-top:4px">
                  ${esc(t.category||'')}
                  ${t.unit?' · '+esc(t.unit):''}
                </small>
              </span>

            </label>
          `;
        }).join('')}
      </div>
    `;

    choices.querySelectorAll('.test-checkbox').forEach(cb=>{
      cb.onchange=()=>{
        const name=cb.value;

        if(cb.checked){
          if(!chosen.includes(name)){
            chosen.push(name);
          }
        }else{
          chosen=chosen.filter(x=>x!==name);
        }

        updateCount();
      };
    });
  }

  search.oninput=fill;

  $('#selectAll').onclick=()=>{
    const q=search.value.trim().toLowerCase();

    db.tests
      .filter(t=>
        t.name.toLowerCase().includes(q)||
        (t.category||'').toLowerCase().includes(q)
      )
      .forEach(t=>{
        if(!chosen.includes(t.name)){
          chosen.push(t.name);
        }
      });

    fill();
    updateCount();
  };

  $('#clearAll').onclick=()=>{
    chosen=[];
    fill();
    updateCount();
  };

  fill();
  updateCount();

  $('#nextReport').onclick=()=>{
    if(chosen.length===0){
      alert('يرجى اختيار تحليل واحد على الأقل');
      return;
    }

    const r={
      id:seq(db.rseq++),
      patientId:p.id,
      date:p.date,
      status:'Draft',
      items:chosen.map(n=>{
        const t=db.tests.find(x=>x.name===n);

        return {
          name:t.name,
          result:'',
          unit:t.unit||'',
          range:t.range||'',
          note:''
        };
      })
    };

    db.reports.unshift(r);

    if(!p.reports.includes(r.id)){
      p.reports.push(r.id);
    }

    save();

    editReport(r.id);
  };
}

/* EDIT REPORT */

function editReport(rid){
  const r=db.reports.find(x=>x.id===rid);
  const p=db.patients.find(x=>x.id===r.patientId);

  if(!r||!p){
    alert('التقرير غير موجود');
    setPage('patients');
    return;
  }

  content.innerHTML=`
    <h1 class="title">
      نتائج التحاليل
    </h1>

    <div class="panel">

      <div class="card">
        <strong>Patient:</strong>
        ${esc(p.name)}

        <br>

        <strong>Patient ID:</strong>
        ${esc(p.id)}

        <br>

        <strong>Report:</strong>
        ${esc(r.id)}

        <br>

        <strong>Date:</strong>
        ${esc(r.date)}
      </div>

      <div class="table-wrap" style="margin-top:12px">

        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Reference Range</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            ${r.items.map((i,n)=>`
              <tr>
                <td>${esc(i.name)}</td>

                <td>
                  <input
                    data-res="${n}"
                    value="${esc(i.result)}"
                    style="min-width:90px"
                  >
                </td>

                <td>
                  <input
                    data-unit="${n}"
                    value="${esc(i.unit)}"
                    style="min-width:80px"
                  >
                </td>

                <td>
                  <input
                    data-range="${n}"
                    value="${esc(i.range)}"
                    style="min-width:120px"
                  >
                </td>

                <td>
                  <input
                    data-note="${n}"
                    value="${esc(i.note)}"
                    style="min-width:100px"
                  >
                </td>

                <td>
                  <button
                    type="button"
                    class="danger"
                    data-del="${n}">
                    حذف
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

      </div>

      <div class="actions">

        <button type="button" id="draft">
          حفظ مسودة
        </button>

        <button type="button" id="final">
          حفظ التقرير النهائي
        </button>

        <button
          type="button"
          class="secondary"
          onclick="setPage('patients')">
          رجوع
        </button>

      </div>

    </div>
  `;

  document.querySelectorAll('[data-res]').forEach(x=>{
    x.oninput=()=>{
      r.items[Number(x.dataset.res)].result=x.value;
    };
  });

  document.querySelectorAll('[data-unit]').forEach(x=>{
    x.oninput=()=>{
      r.items[Number(x.dataset.unit)].unit=x.value;
    };
  });

  document.querySelectorAll('[data-range]').forEach(x=>{
    x.oninput=()=>{
      r.items[Number(x.dataset.range)].range=x.value;
    };
  });

  document.querySelectorAll('[data-note]').forEach(x=>{
    x.oninput=()=>{
      r.items[Number(x.dataset.note)].note=x.value;
    };
  });

  document.querySelectorAll('[data-del]').forEach(x=>{
    x.onclick=()=>{
      if(confirm('هل تريد حذف هذا التحليل من التقرير؟')){
        r.items.splice(Number(x.dataset.del),1);
        save();
        editReport(rid);
      }
    };
  });

  $('#draft').onclick=()=>{
    r.status='Draft';
    save();
    alert('تم حفظ المسودة بنجاح');
    profile(p.id);
  };

  $('#final').onclick=()=>{
    r.status='Final';
    save();
    preview(rid);
  };
}

/* REPORT PREVIEW */

function preview(rid){
  const r=db.reports.find(x=>x.id===rid);
  const p=db.patients.find(x=>x.id===r.patientId);

  content.innerHTML=`
    <h1 class="title">
      التقرير النهائي
    </h1>

    <div class="panel report-preview">

      <div style="text-align:center">
        <h2>${esc(db.settings.labAr)}</h2>
        <h3>${esc(db.settings.labEn)}</h3>

        <p>
          ${esc(db.settings.address)}
        </p>

        <p>
          ${esc(db.settings.phone)}
        </p>
      </div>

      <hr>

      <div class="grid">

        <div>
          <strong>Patient Name:</strong>
          ${esc(p.name)}
        </div>

        <div>
          <strong>Patient ID:</strong>
          ${esc(p.id)}
        </div>

        <div>
          <strong>Age:</strong>
          ${esc(p.age)}
          ${esc(p.ageUnit)}
        </div>

        <div>
          <strong>Gender:</strong>
          ${esc(p.gender)}
        </div>

        <div>
          <strong>Date:</strong>
          ${esc(r.date)}
        </div>

        <div>
          <strong>Report No:</strong>
          ${esc(r.id)}
        </div>

      </div>

      <div class="table-wrap" style="margin-top:20px">

        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Reference Range</th>
            </tr>
          </thead>

          <tbody>
            ${r.items.map(i=>`
              <tr>
                <td>${esc(i.name)}</td>
                <td>${esc(i.result)}</td>
                <td>${esc(i.unit)}</td>
                <td>${esc(i.range)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

      </div>

      ${p.doctor?`
        <p>
          <strong>Doctor:</strong>
          ${esc(p.doctor)}
        </p>
      `:''}

      ${p.notes?`
        <p>
          <strong>Notes:</strong>
          ${esc(p.notes)}
        </p>
      `:''}

      <div class="actions no-print">

        <button onclick="printReport('${r.id}')">
          طباعة / حفظ PDF
        </button>

        <button
          class="secondary"
          onclick="editReport('${r.id}')">
          تعديل التقرير
        </button>

        <button
          class="secondary"
          onclick="profile('${p.id}')">
          رجوع
        </button>

      </div>

    </div>
  `;
}

/* PRINT */

function printReport(rid){
  const r=db.reports.find(x=>x.id===rid);
  const p=db.patients.find(x=>x.id===r.patientId);

  const reportWindow=window.open('','_blank');

  if(!reportWindow){
    alert('يرجى السماح بفتح نافذة التقرير');
    return;
  }

  reportWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">

      <title>Laboratory Report</title>

      <style>
        body{
          font-family:Arial,sans-serif;
          margin:20px;
          color:#172335;
        }

        .header{
          text-align:center;
          border-bottom:2px solid #12345a;
          padding-bottom:15px;
        }

        .patient{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin:20px 0;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th,td{
          border:1px solid #ccc;
          padding:10px;
          text-align:left;
        }

        th{
          background:#eaf1f8;
        }

        .footer{
          margin-top:40px;
          text-align:center;
        }

        @media print{
          body{
            margin:10mm;
          }
        }
      </style>
    </head>

    <body>

      <div class="header">
        <h2>${esc(db.settings.labAr)}</h2>
        <h3>${esc(db.settings.labEn)}</h3>
        <p>${esc(db.settings.address)}</p>
        <p>${esc(db.settings.phone)}</p>
      </div>

      <div class="patient">

        <div>
          <strong>Patient:</strong>
          ${esc(p.name)}
        </div>

        <div>
          <strong>Patient ID:</strong>
          ${esc(p.id)}
        </div>

        <div>
          <strong>Age:</strong>
          ${esc(p.age)} ${esc(p.ageUnit)}
        </div>

        <div>
          <strong>Gender:</strong>
          ${esc(p.gender)}
        </div>

        <div>
          <strong>Date:</strong>
          ${esc(r.date)}
        </div>

        <div>
          <strong>Report No:</strong>
          ${esc(r.id)}
        </div>

      </div>

      <table>

        <thead>
          <tr>
            <th>Test Name</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Reference Range</th>
          </tr>
        </thead>

        <tbody>
          ${r.items.map(i=>`
            <tr>
              <td>${esc(i.name)}</td>
              <td>${esc(i.result)}</td>
              <td>${esc(i.unit)}</td>
              <td>${esc(i.range)}</td>
            </tr>
          `).join('')}
        </tbody>

      </table>

      ${p.doctor?`
        <p><strong>Doctor:</strong>${esc(p.doctor)}</p>
      `:''}

      ${p.notes?`
        <p><strong>Notes:</strong>${esc(p.notes)}</p>
      `:''}

      <div class="footer">
        <p>Laboratory Report</p>
      </div>

      <script>
        window.onload=function(){
          setTimeout(function(){
            window.print();
          },500);
        };
      <\/script>

    </body>
    </html>
  `);

  reportWindow.document.close();
}

/* PATIENTS */

function patients(){
  content.innerHTML=`
    <h1 class="title">سجل المرضى</h1>

    <input
      class="search"
      id="ps"
      placeholder="بحث بالاسم أو ID أو رقم التقرير">

    <div id="pt"></div>
  `;

  function fill(){
    const q=$('#ps').value.toLowerCase();

    const list=db.patients.filter(p=>
      p.name.toLowerCase().includes(q)||
      p.id.toLowerCase().includes(q)||
      p.reports.some(x=>x.toLowerCase().includes(q))
    );

    $('#pt').innerHTML=list.length?`
      <div class="table-wrap">

        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>الاسم</th>
              <th>العمر</th>
              <th>الجنس</th>
              <th>التاريخ</th>
              <th>التقارير</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            ${list.map(p=>`
              <tr>
                <td>${esc(p.id)}</td>
                <td>${esc(p.name)}</td>
                <td>${esc(p.age)} ${esc(p.ageUnit)}</td>
                <td>${esc(p.gender)}</td>
                <td>${esc(p.date)}</td>
                <td>${p.reports.length}</td>
                <td>
                  <button data-p="${esc(p.id)}">
                    فتح
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>

        </table>

      </div>
    `:'<div class="empty">لا توجد نتائج</div>';

    document.querySelectorAll('[data-p]').forEach(b=>{
      b.onclick=()=>profile(b.dataset.p);
    });
  }

  fill();
  $('#ps').oninput=fill;
}

/* PATIENT PROFILE */

function profile(pid){
  const p=db.patients.find(x=>x.id===pid);

  if(!p){
    setPage('patients');
    return;
  }

  content.innerHTML=`
    <h1 class="title">
      ${esc(p.name)}
    </h1>

    <div class="panel">

      <div class="card">

        <p>
          <strong>Patient ID:</strong>
          ${esc(p.id)}
        </p>

        <p>
          <strong>Age:</strong>
          ${esc(p.age)} ${esc(p.ageUnit)}
        </p>

        <p>
          <strong>Gender:</strong>
          ${esc(p.gender)}
        </p>

        <p>
          <strong>Date:</strong>
          ${esc(p.date)}
        </p>

        <p>
          <strong>Doctor:</strong>
          ${esc(p.doctor)}
        </p>

        <p>
          <strong>Notes:</strong>
          ${esc(p.notes)}
        </p>

      </div>

      <h2>التقارير</h2>

      ${
        p.reports.map(id=>{
          const r=db.reports.find(x=>x.id===id);

          if(!r)return '';

          return `
            <div class="card" style="margin-top:10px">

              <strong>${esc(r.id)}</strong>

              <br>

              ${esc(r.date)}
              ·
              ${esc(r.status)}

              <div class="actions">

                <button onclick="preview('${r.id}')">
                  عرض
                </button>

                <button
                  class="secondary"
                  onclick="editReport('${r.id}')">
                  تعديل
                </button>

                <button
                  class="secondary"
                  onclick="printReport('${r.id}')">
                  طباعة
                </button>

              </div>

            </div>
          `;
        }).join('')
        ||'<div class="empty">لا توجد تقارير</div>'
      }

      <div class="actions">

        <button onclick="chooseTests('${p.id}')">
          زيارة جديدة / اختيار تحاليل
        </button>

        <button
          class="secondary"
          onclick="setPage('patients')">
          رجوع
        </button>

      </div>

    </div>
  `;
}

/* TEST MANAGEMENT */

function testsPage(){
  content.innerHTML=`
    <h1 class="title">إدارة التحاليل</h1>

    <div class="panel">

      <form id="tf" class="grid">

        <div class="field">
          <label>اسم التحليل</label>
          <input name="name" required>
        </div>

        <div class="field">
          <label>Category</label>

          <select name="category">
            ${
              [
                'Hematology',
                'Biochemistry',
                'Hormones',
                'Immunology & Serology',
                'Urine Analysis',
                'Microbiology',
                'Cardiac Markers',
                'Other Tests'
              ].map(x=>`<option>${x}</option>`).join('')
            }
          </select>
        </div>

        <div class="field">
          <label>Unit</label>
          <input name="unit">
        </div>

        <div class="field">
          <label>Reference Range</label>
          <input name="range">
        </div>

        <button type="submit">
          إضافة تحليل
        </button>

      </form>

    </div>

    <div class="panel">

      <div class="table-wrap">

        <table>

          <thead>
            <tr>
              <th>Test</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Range</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            ${db.tests.map((t,i)=>`
              <tr>
                <td>${esc(t.name)}</td>
                <td>${esc(t.category)}</td>
                <td>${esc(t.unit)}</td>
                <td>${esc(t.range)}</td>
                <td>
                  <button
                    type="button"
                    class="danger"
                    data-rm="${i}">
                    حذف
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>

        </table>

      </div>

    </div>
  `;

  $('#tf').onsubmit=e=>{
    e.preventDefault();

    const f=new FormData(e.target);

    db.tests.push({
      name:f.get('name'),
      category:f.get('category'),
      unit:f.get('unit'),
      range:f.get('range')
    });

    save();
    testsPage();
  };

  document.querySelectorAll('[data-rm]').forEach(b=>{
    b.onclick=()=>{
      if(confirm('هل تريد حذف التحليل؟')){
        db.tests.splice(Number(b.dataset.rm),1);
        save();
        testsPage();
      }
    };
  });
}

/* STATISTICS */

function stats(){
  const n=db.reports.reduce((a,r)=>a+r.items.length,0);

  const counts={};

  db.reports.forEach(r=>{
    r.items.forEach(i=>{
      counts[i.name]=(counts[i.name]||0)+1;
    });
  });

  const popular=Object.entries(counts)
    .sort((a,b)=>b[1]-a[1]);

  content.innerHTML=`
    <h1 class="title">الإحصائيات</h1>

    <div class="cards">

      <div class="card">
        المرضى
        <div class="metric">${db.patients.length}</div>
      </div>

      <div class="card">
        التقارير
        <div class="metric">${db.reports.length}</div>
      </div>

      <div class="card">
        التحاليل المنفذة
        <div class="metric">${n}</div>
      </div>

      <div class="card">
        تقارير اليوم
        <div class="metric">
          ${db.reports.filter(r=>r.date===today()).length}
        </div>
      </div>

    </div>

    <div class="panel">

      <h2>التحاليل الأكثر طلباً</h2>

      ${
        popular.map(([name,c])=>`
          <p>${esc(name)} — ${c}</p>
        `).join('')
        ||'لا توجد بيانات'
      }

    </div>
  `;
}

/* SETTINGS */

function settingsPage(){
  content.innerHTML=`
    <h1 class="title">الإعدادات</h1>

    <div class="panel">

      <form id="sf" class="grid">

        <div class="field">
          <label>اسم المختبر العربي</label>
          <input
            name="labAr"
            value="${esc(db.settings.labAr)}">
        </div>

        <div class="field">
          <label>اسم المختبر English</label>
          <input
            name="labEn"
            value="${esc(db.settings.labEn)}">
        </div>

        <div class="field">
          <label>Phone</label>
          <input
            name="phone"
            value="${esc(db.settings.phone)}">
        </div>

        <div class="field">
          <label>Address</label>
          <input
            name="address"
            value="${esc(db.settings.address)}">
        </div>

        <button type="submit">
          حفظ الإعدادات
        </button>

      </form>

      <div class="actions">

        <button
          class="secondary"
          onclick="restoreBackup()">
          استعادة نسخة احتياطية
        </button>

        <button
          class="danger"
          onclick="resetAll()">
          مسح البيانات
        </button>

      </div>

    </div>
  `;

  $('#sf').onsubmit=e=>{
    e.preventDefault();

    const f=new FormData(e.target);

    ['labAr','labEn','phone','address']
      .forEach(k=>{
        db.settings[k]=f.get(k);
      });

    save();

    alert('تم حفظ الإعدادات');
  };
}

/* RECENT REPORTS */

function recent(){
  return db.reports.slice(0,5).map(r=>{
    const p=db.patients.find(x=>x.id===r.patientId);

    return `
      <div class="card" style="margin-bottom:8px">

        ${esc(r.id)}
        ·
        ${esc(p?.name||'')}
        ·
        ${esc(r.date)}
        ·
        ${esc(r.status)}

        <div class="actions">
          <button onclick="preview('${r.id}')">
            عرض التقرير
          </button>
        </div>

      </div>
    `;
  }).join('')
  ||'<div class="empty">لا توجد تقارير بعد</div>';
}

/* BACKUP */

function backup(){
  const blob=new Blob(
    [JSON.stringify(db,null,2)],
    {type:'application/json'}
  );

  const u=URL.createObjectURL(blob);

  const a=document.createElement('a');

  a.href=u;
  a.download=`Al-Juman-Backup-${today()}.json`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>{
    URL.revokeObjectURL(u);
  },1000);
}

/* RESTORE */

function restoreBackup(){
  const input=document.createElement('input');

  input.type='file';
  input.accept='.json,application/json';

  input.onchange=()=>{
    const f=input.files[0];

    if(!f)return;

    const reader=new FileReader();

    reader.onload=()=>{
      try{
        const x=JSON.parse(reader.result);

        if(
          !x.patients||
          !x.reports||
          !x.tests
        ){
          throw new Error('Invalid backup');
        }

        if(confirm('استبدال البيانات الحالية بالنسخة الاحتياطية؟')){
          db=x;
          save();
          render();
          alert('تمت الاستعادة بنجاح');
        }

      }catch{
        alert('ملف النسخة الاحتياطية غير صحيح');
      }
    };

    reader.readAsText(f);
  };

  input.click();
}

/* RESET */

function resetAll(){
  if(confirm('تحذير: سيتم حذف جميع البيانات. هل أنت متأكد؟')){
    db=fresh();
    save();
    render();
  }
}

/* GLOBAL FUNCTIONS */

window.setPage=setPage;
window.editReport=editReport;
window.preview=preview;
window.printReport=printReport;
window.chooseTests=chooseTests;
window.profile=profile;
window.restoreBackup=restoreBackup;
window.resetAll=resetAll;
window.backup=backup;

/* START */

render();
