import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionChipRow } from '@/components/ui/OptionChipRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StarRating } from '@/components/ui/StarRating';
import { showAlert } from '@/lib/alert';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import { useCreateOutfit } from '@/lib/hooks/useOutfits';
import {
  useCreatePackingList,
  usePackingList,
  useUpdatePackingList,
  type PackingDayOutfitRecord,
} from '@/lib/hooks/usePackingLists';
import { requestPackingList } from '@/lib/packing';
import { useAuthStore } from '@/lib/stores/authStore';

const GUN_SAYISI = ['2', '3', '4', '5', '7'];
const MEVSIM = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
const HAVA = ['Güneşli', 'Yağmurlu', 'Rüzgarlı', 'Karlı'];
const KONSEPT = ['Günlük', 'Şık', 'Spor', 'Karışık'];

// Ekran içi düzenlenebilir plan: günler + puanlar. Bavul listesi ayrı tutulMAZ —
// her zaman günlerin birleşiminden türetilir (kullanıcının kuralı: bir parça hiçbir
// günde kalmadıysa bavulda da durmasın; eklenen parça bavula da girsin).
type EditableDay = {
  day: number;
  itemIds: string[];
  /** AI'ın aktivite notu — salt gösterim, kullanıcı düzenlemez. */
  note: string;
  /** Kullanıcının kendi notu — input BOŞ başlar (kullanıcı isteği), isterse doldurur. */
  userNote: string;
  rating: number | null;
};

type EditablePlan = {
  context: { mevsim: string; hava?: string; konsept: string; note?: string };
  days: EditableDay[];
  reasoning: string | null;
};

function suitcaseFromDays(days: EditableDay[]): string[] {
  const ids = new Set<string>();
  for (const day of days) for (const id of day.itemIds) ids.add(id);
  return [...ids];
}

function averageRating(days: EditableDay[]): number | null {
  const rated = days.filter((day) => day.rating != null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((total, day) => total + (day.rating ?? 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

export default function BavulHazirlaScreen() {
  const { packingListId } = useLocalSearchParams<{ packingListId?: string }>();
  const userId = useAuthStore((state) => state.userId);
  const { data: items } = useItems();
  const savedPlanQuery = usePackingList(packingListId ?? null);
  const createPackingList = useCreatePackingList();
  const updatePackingList = useUpdatePackingList();
  const createOutfit = useCreateOutfit();

  const [gun, setGun] = useState<string | null>(null);
  const [mevsim, setMevsim] = useState<string | null>(null);
  const [hava, setHava] = useState<string | null>(null);
  const [konsept, setKonsept] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<EditablePlan | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedFromParam, setLoadedFromParam] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [markingWorn, setMarkingWorn] = useState(false);

  // Kayıtlı bavul açıldıysa (Beğenilenler'den) planı düzenlenebilir state'e yükle.
  useEffect(() => {
    if (!packingListId || loadedFromParam || !savedPlanQuery.data) return;
    const record = savedPlanQuery.data;
    setPlan({
      context: record.context,
      days: record.day_outfits.map((day: PackingDayOutfitRecord) => ({
        day: day.day,
        itemIds: day.itemIds,
        note: day.note,
        userNote: day.userNote ?? '',
        rating: day.rating ?? null,
      })),
      reasoning: record.reasoning,
    });
    setSavedId(record.id);
    setLoadedFromParam(true);
  }, [packingListId, loadedFromParam, savedPlanQuery.data]);

  const itemById = new Map((items ?? []).map((item: DbItem) => [item.id, item]));
  const resolveItems = (ids: string[]) =>
    ids.map((id) => itemById.get(id)).filter((item): item is DbItem => Boolean(item));

  const suitcaseIds = plan ? suitcaseFromDays(plan.days) : [];
  const bavulRating = plan ? averageRating(plan.days) : null;
  const editingDayData = plan?.days.find((day) => day.day === editingDay) ?? null;

  const canGenerate = Boolean(gun && mevsim && konsept && !generating);
  const isViewingSaved = Boolean(packingListId);

  async function handleGenerate() {
    if (!gun || !mevsim || !konsept) return;
    if ((items?.length ?? 0) < 3) {
      showAlert('Envanter yetersiz', 'Bavul hazırlamak için envanterinde en az birkaç ürün olmalı.');
      return;
    }
    setGenerating(true);
    setPlan(null);
    setSavedId(null);
    try {
      const context = { mevsim, hava: hava ?? undefined, konsept, note: note.trim() || undefined };
      const result = await requestPackingList({ days: Number(gun), ...context }, items ?? []);
      setPlan({
        context,
        days: result.outfits.map((outfit) => ({
          day: outfit.day,
          itemIds: outfit.items.map((item) => item.id),
          note: outfit.note,
          userNote: '',
          rating: null,
        })),
        reasoning: result.reasoning,
      });
    } catch (error) {
      console.error('Bavul planı alınamadı:', error);
      showAlert('Bavul hazırlanamadı', error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }

  function rateDay(dayNumber: number, rating: number) {
    setPlan((current) =>
      current
        ? { ...current, days: current.days.map((day) => (day.day === dayNumber ? { ...day, rating } : day)) }
        : current
    );
  }

  function removeItemFromDay(dayNumber: number, itemId: string) {
    setPlan((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day) =>
              day.day === dayNumber ? { ...day, itemIds: day.itemIds.filter((id) => id !== itemId) } : day
            ),
          }
        : current
    );
  }

  function setDayUserNote(dayNumber: number, noteText: string) {
    setPlan((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day) => (day.day === dayNumber ? { ...day, userNote: noteText } : day)),
          }
        : current
    );
  }

  /** Günün kombinini gerçek bir kombin olarak kaydedip Giydim akışına gönderir (foto+not). */
  async function handleMarkDayWorn() {
    if (!userId || !plan || !editingDayData) return;
    const dayItems = resolveItems(editingDayData.itemIds);
    if (dayItems.length === 0) {
      showAlert('Kombin boş', 'Önce bu güne en az bir parça ekle.');
      return;
    }
    setMarkingWorn(true);
    try {
      // is_liked: false — Beğenilenler'e düşmesin; Giydim kaydı girildiğinde Geçmiş'te görünür.
      const outfitId = await createOutfit.mutateAsync({
        userId,
        itemIds: dayItems.map((item) => item.id),
        context: {
          mevsim: plan.context.mevsim,
          ...(plan.context.hava ? { hava: plan.context.hava } : {}),
          mekan: 'Seyahat',
          saat: 'Tüm Gün',
          konsept: plan.context.konsept,
        },
        source: 'manual',
        isLiked: false,
      });
      setEditingDay(null);
      setPickerOpen(false);
      router.push({ pathname: '/mark-worn', params: { outfitId } });
    } catch (error) {
      console.error('Bavul günü kombin olarak kaydedilemedi:', error);
      showAlert('İşaretlenemedi', error instanceof Error ? error.message : String(error));
    } finally {
      setMarkingWorn(false);
    }
  }

  function addItemToDay(dayNumber: number, itemId: string) {
    setPlan((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day) =>
              day.day === dayNumber && !day.itemIds.includes(itemId)
                ? { ...day, itemIds: [...day.itemIds, itemId] }
                : day
            ),
          }
        : current
    );
    setPickerOpen(false);
  }

  async function handleSave() {
    if (!plan || !userId) return;
    setSaving(true);
    try {
      const input = {
        userId,
        days: plan.days.length,
        context: plan.context,
        suitcaseItemIds: suitcaseFromDays(plan.days),
        dayOutfits: plan.days.map((day) => ({
          day: day.day,
          itemIds: day.itemIds,
          note: day.note,
          userNote: day.userNote.trim() || null,
          rating: day.rating,
        })),
        reasoning: plan.reasoning,
        rating: averageRating(plan.days),
      };
      if (savedId) {
        await updatePackingList.mutateAsync({ id: savedId, ...input });
      } else {
        const newId = await createPackingList.mutateAsync(input);
        setSavedId(newId);
      }
      showAlert('Kaydedildi', 'Bavulun Kombinlerim > Beğenilenler sekmesinde.');
      if (isViewingSaved) router.back();
    } catch (error) {
      console.error('Bavul kaydedilemedi:', error);
      showAlert('Kaydedilemedi', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (isViewingSaved && savedPlanQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#151718]">
        <ActivityIndicator color="#3461FD" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-1 font-heading-bold text-2xl text-gray-900 dark:text-white">
          {isViewingSaved ? 'Kayıtlı Bavulun' : 'Bavul Hazırla'}
        </Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          {isViewingSaved
            ? 'Gün kartına basılı tutarak parçaları düzenleyebilir, günlere yıldız verebilirsin.'
            : 'Seyahatin için minimum parçayla maksimum kombin: yapay zeka envanterinden kapsül bir bavul kurar, gün gün ne giyeceğini planlar.'}
        </Text>

        {!isViewingSaved && (
          <>
            <OptionChipRow label="Kaç gün?" options={GUN_SAYISI} value={gun} onChange={setGun} />
            <OptionChipRow label="Mevsim" options={MEVSIM} value={mevsim} onChange={setMevsim} />
            <OptionChipRow label="Beklenen hava (opsiyonel)" options={HAVA} value={hava} onChange={setHava} />
            <OptionChipRow label="Konsept" options={KONSEPT} value={konsept} onChange={setKonsept} />

            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
              Ek not (opsiyonel)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder='Örn. "iş gezisi, akşam yemeği de var"'
              placeholderTextColor="#9BA1A6"
              multiline
              maxLength={200}
              className="mb-6 min-h-[64px] rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />

            <PrimaryButton
              label={generating ? 'Bavul hazırlanıyor...' : 'Bavulu Hazırla'}
              disabled={!canGenerate}
              onPress={handleGenerate}
            />
          </>
        )}

        {generating && (
          <View className="mt-6 items-center">
            <ActivityIndicator color="#3461FD" />
            <Text className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
              Kapsül gardırobun kuruluyor — birkaç saniye sürebilir.
            </Text>
          </View>
        )}

        {plan && !generating && (
          <View className={isViewingSaved ? '' : 'mt-8'}>
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="briefcase-outline" size={16} color="#3461FD" />
              <Text className="font-heading text-base text-gray-900 dark:text-white">
                Bavulun ({suitcaseIds.length} parça)
              </Text>
            </View>
            {bavulRating != null && (
              <View className="mb-2 flex-row items-center gap-1.5">
                <Ionicons name="star" size={12} color="#E8B923" />
                <Text className="font-body text-xs text-gray-500 dark:text-gray-400">
                  Bavul puanı: {bavulRating} (gün puanlarının ortalaması)
                </Text>
              </View>
            )}
            <View className="mb-2 mt-2 flex-row flex-wrap gap-3">
              {resolveItems(suitcaseIds).map((item: DbItem) => (
                <View key={item.id} className="w-[22%]">
                  <View className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Ionicons name="shirt-outline" size={20} color="#9BA1A6" />
                      </View>
                    )}
                  </View>
                  <Text
                    numberOfLines={2}
                    className="mt-1 text-center font-body text-[10px] text-gray-600 dark:text-gray-400">
                    {item.name ?? 'Ürün'}
                  </Text>
                </View>
              ))}
            </View>

            {plan.reasoning ? (
              <View className="mb-6 flex-row items-start gap-2 rounded-2xl bg-primary/5 p-3">
                <Ionicons name="bulb-outline" size={16} color="#3461FD" style={{ marginTop: 1 }} />
                <Text className="flex-1 font-body text-xs leading-5 text-gray-700 dark:text-gray-300">
                  {plan.reasoning}
                </Text>
              </View>
            ) : null}

            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color="#3461FD" />
              <Text className="font-heading text-base text-gray-900 dark:text-white">Gün Gün Plan</Text>
            </View>
            <Text className="mb-3 font-body text-xs text-gray-400 dark:text-gray-500">
              Bir günün parçalarını düzenlemek için kartına basılı tut.
            </Text>
            <View className="gap-3">
              {plan.days.map((day) => (
                <Pressable
                  key={day.day}
                  onLongPress={() => setEditingDay(day.day)}
                  className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
                  <View className="flex-row items-center justify-between">
                    <Text className="mb-2 font-body-semibold text-sm text-primary">{day.day}. Gün</Text>
                    <StarRating value={day.rating} onChange={(value) => rateDay(day.day, value)} size={16} />
                  </View>
                  <View className="mb-2 flex-row">
                    {resolveItems(day.itemIds)
                      .slice(0, 5)
                      .map((item: DbItem) => (
                        <View
                          key={item.id}
                          className="-mr-2 h-12 w-12 overflow-hidden rounded-lg border border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700">
                          {item.image_url ? (
                            <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <View className="h-full w-full items-center justify-center">
                              <Ionicons name="shirt-outline" size={16} color="#9BA1A6" />
                            </View>
                          )}
                        </View>
                      ))}
                  </View>
                  <Text className="font-body text-xs text-gray-700 dark:text-gray-300">
                    {resolveItems(day.itemIds)
                      .map((item: DbItem) => item.name)
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {day.note ? (
                    <Text className="mt-1 font-body text-[11px] italic text-gray-500 dark:text-gray-400">
                      {day.note}
                    </Text>
                  ) : null}
                  {day.userNote.trim() ? (
                    <View className="mt-1.5 flex-row items-start gap-1.5">
                      <Ionicons name="chatbubble-ellipses-outline" size={12} color="#3461FD" style={{ marginTop: 1 }} />
                      <Text className="flex-1 font-body text-[11px] text-gray-700 dark:text-gray-300">
                        {day.userNote}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>

            <View className="mt-5 gap-3">
              <PrimaryButton
                label={
                  saving
                    ? 'Kaydediliyor...'
                    : savedId
                      ? 'Değişiklikleri Kaydet'
                      : 'Bavulu Kaydet'
                }
                disabled={saving}
                onPress={handleSave}
              />
              {!isViewingSaved && (
                <Pressable
                  onPress={handleGenerate}
                  className="flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-3">
                  <Ionicons name="refresh-outline" size={16} color="#3461FD" />
                  <Text className="font-heading text-sm text-primary">Yeniden Hazırla</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Gün düzenleme popup'ı — TAM BOYA yakın (kullanıcı isteği: küçük popup'ta (-)/(+) kayıyordu).
          3 sütunlu grid + güne özel not inputu + Giydim köprüsü. */}
      <Modal
        visible={editingDay != null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setEditingDay(null);
          setPickerOpen(false);
        }}>
        <View className="flex-1 bg-black/40">
          <View className="mt-14 flex-1 rounded-t-3xl bg-white p-5 dark:bg-[#1E2021]">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-heading-bold text-lg text-gray-900 dark:text-white">
                {editingDay}. Gün Kombinini Düzenle
              </Text>
              <Pressable
                onPress={() => {
                  setEditingDay(null);
                  setPickerOpen(false);
                }}
                hitSlop={8}>
                <Ionicons name="close" size={22} color="#9BA1A6" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              {editingDayData && (
                <>
                  <View className="flex-row flex-wrap gap-3">
                    {resolveItems(editingDayData.itemIds).map((item: DbItem) => (
                      <View key={item.id} className="w-[30%]">
                        <View className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                          {item.image_url ? (
                            <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <View className="h-full w-full items-center justify-center">
                              <Ionicons name="shirt-outline" size={24} color="#9BA1A6" />
                            </View>
                          )}
                          {/* (-) rozeti görselin İÇİNDE sağ üstte — dışarı taşan konumlama
                              dar ekranlarda kayıp kırpılıyordu (cihazda görüldü). */}
                          <Pressable
                            onPress={() => removeItemFromDay(editingDayData.day, item.id)}
                            hitSlop={6}
                            className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-accent-coral">
                            <Ionicons name="remove" size={18} color="#FFFFFF" />
                          </Pressable>
                        </View>
                        <Text
                          numberOfLines={1}
                          className="mt-1 text-center font-body text-[11px] text-gray-600 dark:text-gray-400">
                          {item.name ?? 'Ürün'}
                        </Text>
                      </View>
                    ))}

                    {/* (+) kutusu: parça kutularıyla birebir aynı iskelet (sarmalayıcı + iç kare),
                        böylece boyutu/hizası asla şaşmıyor. */}
                    <View className="w-[30%]">
                      <Pressable
                        onPress={() => setPickerOpen((open) => !open)}
                        className="aspect-square items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5">
                        <Ionicons name={pickerOpen ? 'chevron-up' : 'add'} size={28} color="#3461FD" />
                      </Pressable>
                      <Text className="mt-1 text-center font-body text-[11px] text-primary">
                        {pickerOpen ? 'Kapat' : 'Parça Ekle'}
                      </Text>
                    </View>
                  </View>

                  {pickerOpen && (
                    <View className="mt-4">
                      <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
                        Envanterden ekle
                      </Text>
                      <View className="flex-row flex-wrap gap-3">
                        {(items ?? [])
                          .filter((item: DbItem) => !editingDayData.itemIds.includes(item.id))
                          .map((item: DbItem) => (
                            <Pressable
                              key={item.id}
                              onPress={() => addItemToDay(editingDayData.day, item.id)}
                              className="w-[30%]">
                              <View className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                                {item.image_url ? (
                                  <Image
                                    source={{ uri: item.image_url }}
                                    className="h-full w-full"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="h-full w-full items-center justify-center">
                                    <Ionicons name="shirt-outline" size={24} color="#9BA1A6" />
                                  </View>
                                )}
                              </View>
                              <Text
                                numberOfLines={1}
                                className="mt-1 text-center font-body text-[11px] text-gray-600 dark:text-gray-400">
                                {item.name ?? 'Ürün'}
                              </Text>
                            </Pressable>
                          ))}
                      </View>
                    </View>
                  )}

                  <Text className="mb-2 mt-5 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
                    Güne özel notun (opsiyonel)
                  </Text>
                  <TextInput
                    value={editingDayData.userNote}
                    onChangeText={(text) => setDayUserNote(editingDayData.day, text)}
                    placeholder='Örn. "Bu kombini otele varınca akşam yemeğinde giyeceğim"'
                    placeholderTextColor="#9BA1A6"
                    multiline
                    maxLength={120}
                    className="min-h-[52px] rounded-2xl border border-gray-200 px-4 py-3 font-body text-sm text-gray-900 dark:border-gray-700 dark:text-gray-100"
                  />

                  <Pressable
                    onPress={handleMarkDayWorn}
                    disabled={markingWorn}
                    className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-3">
                    <Ionicons name="checkmark-circle-outline" size={16} color="#3461FD" />
                    <Text className="font-heading text-sm text-primary">
                      {markingWorn ? 'Hazırlanıyor...' : 'Bu Kombini Giydim Olarak İşaretle'}
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>

            <View className="mt-3">
              <PrimaryButton
                label="Tamam"
                onPress={() => {
                  setEditingDay(null);
                  setPickerOpen(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
