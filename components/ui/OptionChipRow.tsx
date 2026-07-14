import { Pressable, Text, View } from 'react-native';

type Props = {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
};

export function OptionChipRow({ label, options, value, onChange }: Props) {
  return (
    <View className="mb-5">
      <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={`rounded-full border px-4 py-2 ${
                selected
                  ? 'border-primary bg-primary'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}>
              <Text
                className={`font-body-medium text-sm ${
                  selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
