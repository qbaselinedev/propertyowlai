'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Customer { id: string; full_name: string; email: string; phone: string|null; phone_secondary: string|null; phone_work: string|null; address: string|null; notes: string|null; propertyowl_user_id: string|null; invite_sent_at: string|null; joined_at: string|null; created_at: string }
interface LinkedProperty { linkId: string; property_id: string; address: string; suburb: string; postcode: string|null; price: number|null; property_type: string; s32_reviewed: boolean; risk_score: number|null; validated_at: string|null }
interface Partner { id: string; full_name: string; email: string; partner_type: string; company: string|null; joined_at: string|null }
interface SentEmail { id: string; to_email: string; subject: string; body: string; sent_at: string; property_address?: string }
interface TaskItem { id: string; title: string; description?: string; priority: string; status: string; due_date?: string; created_at: string }

const PL: Record<string,string> = { buyer_agent:"Buyer's Agent", broker:'Broker', real_estate_agent:'Real Estate Agent' }
const TI: Record<string,string> = { house:'🏠', apartment:'🏢', townhouse:'🏘️', land:'🌿', other:'🏗️' }

export default function CustomerDetailPage() {
  const params = useParams(); const router = useRouter()
  const supabase = createClient(); const id = params?.id as string

  const [customer, setCustomer] = useState<Customer|null>(null)
  const [properties, setProperties] = useState<LinkedProperty[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [allPartners, setAllPartners] = useState<Partner[]>([])
  const [myProps, setMyProps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState<string|null>(null)
  const [addPropId, setAddPropId] = useState('')
  const [addPartnerId, setAddPartnerId] = useState('')
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [userId, setUserId] = useState<string|null>(null)
  const [tab, setTab] = useState<'properties'|'partners'|'notes'|'activity'>('properties')

  // Edit
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [editForm, setEditForm] = useState({ phone:'', phone_secondary:'', phone_work:'', address:'' })

  // Activity
  const [actFilter, setActFilter] = useState<'all'|'tasks'|'emails'|'phone'>('all')
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [emailSubTab, setEmailSubTab] = useState<'inbox'|'sent'|'compose'>('sent')

  // Compose
  const [composeEmail, setComposeEmail] = useState({ to:'', subject:'', body:'' })
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return; setUserId(user.id)

    const { data: cust } = await supabase.from('crm_customers').select('*').eq('id', id).eq('conveyancer_id', user.id).single()
    if (!cust) { router.push('/dashboard/customers'); return }
    setCustomer(cust); setNotes(cust.notes ?? '')
    setEditForm({ phone: cust.phone??'', phone_secondary: cust.phone_secondary??'', phone_work: cust.phone_work??'', address: cust.address??'' })
    setComposeEmail(p => ({ ...p, to: cust.email }))

    const { data: propLinks } = await supabase.from('crm_customer_properties')
      .select('id, property_id, validated_at, properties(address, suburb, postcode, price, property_type, s32_reviewed, risk_score)')
      .eq('customer_id', id)
    setProperties((propLinks??[]).map((l:any) => ({ linkId:l.id, property_id:l.property_id, address:l.properties?.address??'', suburb:l.properties?.suburb??'', postcode:l.properties?.postcode, price:l.properties?.price, property_type:l.properties?.property_type??'other', s32_reviewed:l.properties?.s32_reviewed??false, risk_score:l.properties?.risk_score, validated_at:l.validated_at })))

    const { data: allMyProps } = await supabase.from('properties').select('id, address, suburb').eq('user_id', user.id).order('created_at', { ascending: false })
    setMyProps(allMyProps??[])

    const { data: allP } = await supabase.from('crm_partners').select('id, full_name, email, partner_type, company, joined_at').eq('conveyancer_id', user.id).order('full_name')
    setAllPartners(allP??[])

    const propertyIds = (propLinks??[]).map((l:any) => l.property_id)
    if (propertyIds.length > 0) {
      const { data: pp } = await supabase.from('crm_property_partners').select('crm_partners(id, full_name, email, partner_type, company, joined_at)').in('property_id', propertyIds).eq('conveyancer_id', user.id)
      const u: Record<string,Partner> = {}; (pp??[]).forEach((r:any) => { const p = r.crm_partners; if (p && !u[p.id]) u[p.id] = p }); setPartners(Object.values(u))
    }

    const { data: emails } = await supabase.from('crm_emails').select('*').eq('customer_id', id).eq('conveyancer_id', user.id).order('sent_at', { ascending: false })
    setSentEmails(emails??[])

    const { data: taskData } = await supabase.from('crm_tasks').select('*').eq('conveyancer_id', user.id).order('created_at', { ascending: false })
    setTasks(taskData??[])

    setLoading(false)
  }

  async function handleAddProperty() { if (!addPropId||!userId) return; setSaving(true); await supabase.from('crm_customer_properties').insert({ customer_id:id, property_id:addPropId, conveyancer_id:userId }); setAddPropId(''); setSaving(false); await load() }
  async function handleAddPartner() { if (!addPartnerId||!userId||properties.length===0) return; setSaving(true); for (const p of properties) { await supabase.from('crm_property_partners').upsert({ property_id:p.property_id, partner_id:addPartnerId, conveyancer_id:userId }, { onConflict:'property_id,partner_id', ignoreDuplicates:true }) }; setAddPartnerId(''); setSaving(false); await load() }
  async function handleValidate(pid:string) { setSaving(true); await supabase.from('crm_customer_properties').update({ validated_at:new Date().toISOString() }).eq('customer_id',id).eq('property_id',pid); setSaving(false); await load() }
  async function handleInvite(pid?:string) { setInviting(pid??'main'); await fetch('/api/crm/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'customer',contactId:id,propertyId:pid})}); setInviting(null); await load() }
  async function handleSaveNotes() { await supabase.from('crm_customers').update({notes,updated_at:new Date().toISOString()}).eq('id',id); setEditNotes(false); if (customer) setCustomer({...customer,notes}) }
  async function handleSaveCustomerDetails() { setSaving(true); await supabase.from('crm_customers').update({phone:editForm.phone.trim()||null,phone_secondary:editForm.phone_secondary.trim()||null,phone_work:editForm.phone_work.trim()||null,address:editForm.address.trim()||null,updated_at:new Date().toISOString()}).eq('id',id); if (customer) setCustomer({...customer,phone:editForm.phone.trim()||null,phone_secondary:editForm.phone_secondary.trim()||null,phone_work:editForm.phone_work.trim()||null,address:editForm.address.trim()||null}); setEditingCustomer(false); setSaving(false) }

  async function handleSendEmail() {
    if (!composeEmail.to||!composeEmail.subject||!composeEmail.body) return
    setSending(true); setSendSuccess(false)
    const res = await fetch('/api/crm/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:id,to:composeEmail.to,subject:composeEmail.subject,body:composeEmail.body})})
    setSending(false)
    if (res.ok) { setSendSuccess(true); setComposeEmail({to:customer?.email??'',subject:'',body:''}); setEmailSubTab('sent'); setTimeout(()=>setSendSuccess(false),3000); await load() }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full"/></div>
  if (!customer) return null

  const isActive = !!(customer.joined_at||customer.propertyowl_user_id)
  const isInvited = !!customer.invite_sent_at
  const sLabel = isActive?'Active':isInvited?'Invited':'CRM Only'
  const sClass = isActive?'bg-emerald-50 text-emerald-700 border-emerald-200':isInvited?'bg-blue-50 text-blue-700 border-blue-200':'bg-gray-50 text-gray-500 border-gray-200'
  const sDot = isActive?'bg-emerald-500':isInvited?'bg-blue-500':'bg-gray-300'
  const unlinkedProps = myProps.filter(p => !properties.find(lp => lp.property_id===p.id))
  const unlinkedPartners = allPartners.filter(p => !partners.find(lp => lp.id===p.id))

  // Build unified timeline for "All" view
  const allActivities = [
    ...sentEmails.map(e => ({ id:e.id, type:'email' as const, title:e.subject, sub:`To: ${e.to_email}`, date:e.sent_at, extra:e.property_address })),
    ...tasks.map(t => ({ id:t.id, type:'task' as const, title:t.title, sub:t.description, date:t.created_at, priority:t.priority, status:t.status })),
  ].sort((a,b) => new Date(b.date).getTime()-new Date(a.date).getTime())

  return (
    <div className="max-w-4xl space-y-5 pb-10">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700">Home</Link><span>›</span>
        <Link href="/dashboard/customers" className="hover:text-gray-700">Customers</Link><span>›</span>
        <span className="text-gray-700 font-semibold">{customer.full_name}</span>
      </nav>

      {/* Customer card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center text-[#E8001D] font-bold text-xl">{customer.full_name.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.full_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{customer.email}{customer.phone?` · ${customer.phone}`:''}</p>
              {customer.address && <p className="text-xs text-gray-400 mt-0.5">📍 {customer.address}</p>}
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mt-2 ${sClass}`}><span className={`w-1.5 h-1.5 rounded-full ${sDot}`}/>{sLabel}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setEditingCustomer(true)} className="border border-gray-200 text-gray-600 hover:text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg">✏️ Edit Details</button>
            {!isActive && <button onClick={()=>handleInvite()} disabled={inviting==='main'} className="bg-[#E8001D] hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50">{inviting==='main'?'⏳ Sending…':isInvited?'↺ Resend':'📨 Invite to PropertyOwl'}</button>}
          </div>
        </div>
      </div>

      {/* Edit customer inline */}
      {editingCustomer && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-gray-900">Edit Details</h2><button onClick={()=>setEditingCustomer(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"><p className="text-xs text-gray-500"><strong>Email:</strong> {customer.email}</p><p className="text-[10px] text-gray-400 mt-1">🔒 Primary email cannot be changed</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mobile (Primary)</label><input type="tel" value={editForm.phone} onChange={e=>setEditForm(f=>({...f,phone:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"/></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mobile (Secondary)</label><input type="tel" value={editForm.phone_secondary} onChange={e=>setEditForm(f=>({...f,phone_secondary:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"/></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Work / Landline</label><input type="tel" value={editForm.phone_work} onChange={e=>setEditForm(f=>({...f,phone_work:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"/></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address</label><input type="text" value={editForm.address} onChange={e=>setEditForm(f=>({...f,address:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"/></div>
          </div>
          <div className="flex gap-3 pt-2"><button onClick={handleSaveCustomerDetails} disabled={saving} className="bg-[#E8001D] hover:bg-red-700 text-white font-semibold text-sm px-5 py-2 rounded-lg disabled:opacity-50">{saving?'Saving…':'Save'}</button><button onClick={()=>setEditingCustomer(false)} className="border border-gray-200 text-gray-500 font-semibold text-sm px-5 py-2 rounded-lg">Cancel</button></div>
        </div>
      )}

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{k:'properties',l:`Properties (${properties.length})`},{k:'partners',l:`Partners (${partners.length})`},{k:'notes',l:'Notes'},{k:'activity',l:`📋 Activity (${allActivities.length})`}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab===t.k?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* ══ Properties ══ */}
      {tab==='properties' && (
        <div className="space-y-4">
          {properties.length===0?<div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center"><p className="text-3xl mb-2">🏠</p><p className="text-sm font-bold text-gray-700">No properties linked</p></div>
          : <div className="grid gap-3">{properties.map(p=>(
            <div key={p.linkId} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{TI[p.property_type]??'🏗️'}</span>
                  <div>
                    <Link href={`/dashboard/property/${p.property_id}`} className="text-sm font-bold text-gray-900 hover:text-[#E8001D]">{p.address}</Link>
                    <p className="text-xs text-gray-400 mt-0.5">{p.suburb}{p.postcode&&`, ${p.postcode}`}</p>
                    {p.risk_score!=null&&p.risk_score>0&&<span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${p.risk_score>=7?'bg-red-50 text-red-600':p.risk_score>=4?'bg-amber-50 text-amber-600':'bg-emerald-50 text-emerald-600'}`}>{p.risk_score} risk item{p.risk_score!==1?'s':''}</span>}
                  </div>
                </div>
                <div className="flex gap-2">{!p.validated_at?<button onClick={()=>handleValidate(p.property_id)} disabled={saving} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40">✓ Finalise</button>:<span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Finalised</span>}</div>
              </div>
            </div>
          ))}</div>}
          {unlinkedProps.length>0 && <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-sm font-bold text-gray-700 mb-2">Link a property</p><div className="flex gap-3"><select value={addPropId} onChange={e=>setAddPropId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E8001D]"><option value="">Select…</option>{unlinkedProps.map(p=><option key={p.id} value={p.id}>{p.address} — {p.suburb}</option>)}</select><button onClick={handleAddProperty} disabled={!addPropId||saving} className="bg-[#E8001D] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-40">Link</button></div></div>}
        </div>
      )}

      {/* ══ Partners ══ */}
      {tab==='partners' && (
        <div className="space-y-4">
          {partners.length===0?<div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center"><p className="text-3xl mb-2">🤝</p><p className="text-sm font-bold text-gray-700">No partners linked</p></div>
          :<div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"><table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-100">{['Partner','Type','Company','Status'].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead><tbody>{partners.map((p,i)=><tr key={p.id} className={`border-b border-gray-50 ${i%2?'bg-gray-50/50':''}`}><td className="px-5 py-3"><p className="text-sm font-semibold text-gray-900">{p.full_name}</p><p className="text-xs text-gray-400">{p.email}</p></td><td className="px-5 py-3 text-xs text-gray-600">{PL[p.partner_type]??p.partner_type}</td><td className="px-5 py-3 text-xs text-gray-400">{p.company??'—'}</td><td className="px-5 py-3">{p.joined_at?<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">✓ Active</span>:<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>}</td></tr>)}</tbody></table></div>}
          {unlinkedPartners.length>0&&properties.length>0&&<div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-sm font-bold text-gray-700 mb-2">Associate a partner</p><div className="flex gap-3"><select value={addPartnerId} onChange={e=>setAddPartnerId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E8001D]"><option value="">Select…</option>{unlinkedPartners.map(p=><option key={p.id} value={p.id}>{p.full_name} — {PL[p.partner_type]??p.partner_type}</option>)}</select><button onClick={handleAddPartner} disabled={!addPartnerId||saving} className="bg-[#E8001D] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-40">Link</button></div></div>}
        </div>
      )}

      {/* ══ Notes ══ */}
      {tab==='notes' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-base font-bold text-gray-900">Notes</h2><button onClick={()=>setEditNotes(e=>!e)} className="text-sm text-[#E8001D] font-semibold hover:underline">{editNotes?'Cancel':'✏️ Edit'}</button></div>
          {editNotes?<div><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={6} placeholder="Notes…" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8001D] resize-none mb-3"/><button onClick={handleSaveNotes} className="bg-[#E8001D] text-white font-semibold text-sm px-5 py-2 rounded-lg">Save</button></div>
          :<p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{customer.notes||<span className="text-gray-400 italic">No notes yet.</span>}</p>}
        </div>
      )}

      {/* ══ Activity ══ */}
      {tab==='activity' && (
        <div className="space-y-4">

          {/* Activity type filter bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1.5">
              {[{k:'all',l:`All (${allActivities.length})`},{k:'tasks',l:`Tasks (${tasks.length})`},{k:'emails',l:`Emails (${sentEmails.length})`},{k:'phone',l:'Phone'}].map(f=>(
                <button key={f.k} onClick={()=>{setActFilter(f.k as any);if(f.k==='emails')setEmailSubTab('sent')}} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${actFilter===f.k?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'}`}>{f.l}</button>
              ))}
            </div>
            {/* Context-aware action button */}
            {actFilter==='tasks' && <button className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white">+ New Task</button>}
            {actFilter==='phone' && <button className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white">📞 Log Call</button>}
          </div>

          {sendSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700 font-semibold">✓ Email sent successfully!</div>}

          {/* ── ALL: unified timeline ── */}
          {actFilter==='all' && (
            allActivities.length===0
            ? <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center"><p className="text-3xl mb-2">📋</p><p className="text-sm font-bold text-gray-700 mb-1">No activities yet</p><p className="text-xs text-gray-400">Tasks, emails and phone logs will appear here</p></div>
            : <div className="space-y-2">{allActivities.map(a=>{
              const icon = a.type==='email'?'✉️':'📌'
              const tb = a.type==='email'?'bg-blue-50 text-blue-700 border-blue-200':'bg-amber-50 text-amber-700 border-amber-200'
              const bl = a.type==='email'?'border-l-blue-400':((a as any).priority==='high'?'border-l-red-500':(a as any).priority==='medium'?'border-l-amber-500':'border-l-blue-500')
              return (
                <div key={a.id} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${bl} px-5 py-3.5 flex items-start justify-between gap-3`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-lg mt-0.5">{icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tb}`}>{a.type.toUpperCase()}</span>
                        {(a as any).priority && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(a as any).priority==='high'?'bg-red-100 text-red-700':(a as any).priority==='medium'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{(a as any).priority.toUpperCase()}</span>}
                        {(a as any).status==='completed' && <span className="text-[10px] font-bold text-emerald-600">✓ Done</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                      {a.sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.sub}</p>}
                      {a.type==='email' && (a as any).extra && <p className="text-xs text-gray-400 mt-0.5">Property: {(a as any).extra}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(a.date).toLocaleDateString()} {new Date(a.date).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              )
            })}</div>
          )}

          {/* ── TASKS: task list ── */}
          {actFilter==='tasks' && (
            tasks.length===0
            ? <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center"><p className="text-3xl mb-2">📌</p><p className="text-sm font-bold text-gray-700 mb-1">No tasks yet</p><p className="text-xs text-gray-400">Create tasks from property analysis or add manually</p></div>
            : <div className="space-y-2">{tasks.map(t=>{
              const bl = t.priority==='high'?'border-l-red-500':t.priority==='medium'?'border-l-amber-500':'border-l-blue-500'
              return (
                <div key={t.id} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${bl} px-5 py-3.5 flex items-center justify-between`}>
                  <div>
                    <p className={`text-sm font-semibold ${t.status==='completed'?'line-through text-gray-400':'text-gray-900'}`}>{t.title}</p>
                    {t.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.priority==='high'?'bg-red-100 text-red-700':t.priority==='medium'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{t.priority.toUpperCase()}</span>
                      {t.due_date && <span className="text-[10px] text-gray-400">Due: {t.due_date}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              )
            })}</div>
          )}

          {/* ── EMAILS: Inbox / Sent / Compose sub-tabs ── */}
          {actFilter==='emails' && (
            <div className="space-y-4">
              {/* Sub-tab bar */}
              <div className="flex gap-0 border-b border-gray-200">
                {[{k:'inbox',l:'📥 Inbox'},{k:'sent',l:`📤 Sent (${sentEmails.length})`},{k:'compose',l:'✏️ Compose'}].map(t=>(
                  <button key={t.k} onClick={()=>setEmailSubTab(t.k as any)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${emailSubTab===t.k?'border-[#E8001D] text-[#E8001D]':'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.l}</button>
                ))}
              </div>

              {/* Inbox placeholder */}
              {emailSubTab==='inbox' && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                  <p className="text-3xl mb-2">📥</p>
                  <p className="text-sm font-bold text-gray-700">Inbox</p>
                  <p className="text-xs text-gray-400 mt-1">Incoming email integration will be available in a future update</p>
                </div>
              )}

              {/* Sent emails */}
              {emailSubTab==='sent' && (
                sentEmails.length===0
                ? <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                    <p className="text-3xl mb-2">📤</p>
                    <p className="text-sm font-bold text-gray-700">No emails sent yet</p>
                    <p className="text-xs text-gray-400 mt-1">Emails sent from property analysis or composed here will appear</p>
                    <button onClick={()=>setEmailSubTab('compose')} className="mt-4 bg-[#E8001D] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700">✏️ Compose Email</button>
                  </div>
                : <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {sentEmails.map((e,i) => (
                      <div key={e.id} className={`px-5 py-4 ${i>0?'border-t border-gray-100':''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900">{e.subject}</p>
                            <p className="text-xs text-gray-400 mt-0.5">To: {e.to_email}</p>
                            {e.property_address && <p className="text-xs text-gray-400">Property: {e.property_address}</p>}
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{e.body.substring(0,200)}{e.body.length>200?'…':''}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{new Date(e.sent_at).toLocaleDateString()} {new Date(e.sent_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              )}

              {/* Compose */}
              {emailSubTab==='compose' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Compose Email</h3>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">To</label><input type="email" value={composeEmail.to} onChange={e=>setComposeEmail(p=>({...p,to:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"/></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Subject</label><input type="text" value={composeEmail.subject} onChange={e=>setComposeEmail(p=>({...p,subject:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"/></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Message</label><textarea value={composeEmail.body} onChange={e=>setComposeEmail(p=>({...p,body:e.target.value}))} rows={8} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-y"/></div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"><p className="text-xs text-gray-500"><strong>Note:</strong> A disclaimer footer will be appended automatically.</p></div>
                  <button onClick={handleSendEmail} disabled={sending||!composeEmail.to||!composeEmail.subject||!composeEmail.body} className="bg-[#E8001D] hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50">{sending?'⏳ Sending…':'📨 Send Email'}</button>
                </div>
              )}
            </div>
          )}

          {/* ── PHONE: placeholder ── */}
          {actFilter==='phone' && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <p className="text-3xl mb-2">📞</p>
              <p className="text-sm font-bold text-gray-700">Phone Call Log</p>
              <p className="text-xs text-gray-400 mt-1">Call logging will be available in a future update</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
