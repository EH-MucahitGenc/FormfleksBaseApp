import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, TextArea } from 'devextreme-react';
import notify from 'devextreme/ui/notify';
import { apiClient } from '@/lib/axios';

/**
 * @component QuickActionPage
 * @description E-posta içerisindeki "Onayla, Reddet, İade Et" butonlarına tıklandığında açılan arayüzdür.
 * Kullanıcı sisteme giriş yapmamış (login olmamış) olsa dahi URL'deki "token" üzerinden işlem yapmasını sağlar.
 * 
 * Güvenlik Önlemleri:
 * - İşlem sadece JWT token geçerliyse yapılabilir.
 * - Mükerrer tıklamalarda backend'den gelen uyarıyı ekrana tam ekran bir hata ile yansıtır.
 * - Kullanıcının istemeden onaylamasını engellemek için önce bu sayfa açılır ve "İşlemi Tamamla" butonuna basması beklenir.
 */
export default function QuickActionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const action = searchParams.get('action'); // "approve", "reject", "return"
  
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorState, setErrorState] = useState<{ isError: boolean; message: string }>({ isError: false, message: '' });

  if (!token || !action) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-6xl text-red-500">⚠</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800">Geçersiz Bağlantı</h1>
          <p className="text-gray-600">Bu işlem için gerekli olan güvenlik anahtarı bulunamadı.</p>
        </div>
      </div>
    );
  }

  const isCommentRequired = action === 'reject' || action === 'return';

  const actionDetails = {
    approve: { title: 'Formu Onayla', color: '#16a34a', icon: 'check', text: 'Formu onaylamak üzeresiniz.' },
    reject: { title: 'Formu Reddet', color: '#dc2626', icon: 'close', text: 'Formu reddetmek üzeresiniz. Lütfen gerekçe yazınız.' },
    return: { title: 'Formu İade Et', color: '#ea580c', icon: 'undo', text: 'Formu düzeltilmesi için iade etmek üzeresiniz. Lütfen gerekçe yazınız.' }
  }[action] || { title: 'Bilinmeyen İşlem', color: '#6b7280', icon: 'help', text: '' };

  const handleSubmit = async () => {
    if (isCommentRequired && !comment.trim()) {
      notify('Lütfen işleminiz için bir açıklama giriniz.', 'error', 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/dynamic-forms/quick-action', {
        token: token,
        actionType: action,
        comment: comment
      });
      
      setIsSuccess(true);
      notify('İşleminiz başarıyla gerçekleştirildi.', 'success', 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || 'İşlem sırasında bir hata oluştu.';
      if (errorMsg.includes('daha önce') || errorMsg.includes('süresi dolmuş') || errorMsg.includes('bulunamadı')) {
         setErrorState({ isError: true, message: errorMsg });
      } else {
         notify(errorMsg, 'error', 5000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (errorState.isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-6xl text-orange-500">⚠</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800">İşlem Yapılamıyor</h1>
          <p className="mb-6 text-gray-600">{errorState.message}</p>
          <Button
            text="Ana Sayfaya Dön"
            type="normal"
            stylingMode="outlined"
            onClick={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-6xl text-green-500">✓</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800">İşlem Başarılı</h1>
          <p className="mb-6 text-gray-600">Tercihiniz sisteme kaydedildi. Bu sekmeyi kapatabilirsiniz.</p>
          <Button
            text="Ana Sayfaya Dön"
            type="normal"
            stylingMode="outlined"
            onClick={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: actionDetails.color }}
          >
            <i className={`dx-icon-${actionDetails.icon} text-2xl`}></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{actionDetails.title}</h1>
            <p className="text-sm text-gray-500">Hızlı İşlem Ekranı</p>
          </div>
        </div>

        <p className="mb-6 text-gray-700">{actionDetails.text}</p>

        {isCommentRequired && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Açıklama / Gerekçe <span className="text-red-500">*</span></label>
            <TextArea
              height={100}
              value={comment}
              onValueChanged={(e) => setComment(e.value)}
              placeholder="Lütfen bu işlem için gerekçenizi yazınız..."
            />
          </div>
        )}
        
        {!isCommentRequired && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Açıklama (İsteğe Bağlı)</label>
            <TextArea
              height={80}
              value={comment}
              onValueChanged={(e) => setComment(e.value)}
              placeholder="Eklemek istediğiniz notlar..."
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            text="Vazgeç"
            stylingMode="text"
            disabled={isSubmitting}
            onClick={() => navigate('/')}
          />
          <Button
            text="İşlemi Tamamla"
            type="default"
            stylingMode="contained"
            icon="save"
            useSubmitBehavior={false}
            disabled={isSubmitting}
            onClick={handleSubmit}
            elementAttr={{ style: `background-color: ${actionDetails.color}; border-color: ${actionDetails.color};` }}
          />
        </div>
      </div>
    </div>
  );
}
