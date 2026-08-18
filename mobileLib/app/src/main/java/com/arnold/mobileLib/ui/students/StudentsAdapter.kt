package com.arnold.mobileLib.ui.students

import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import com.arnold.mobileLib.R
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.arnold.mobileLib.data.model.Student
import com.arnold.mobileLib.databinding.ItemStudentBinding

class StudentsAdapter :

    ListAdapter<Student, StudentsAdapter.StudentViewHolder>(DiffCallback()) {

    private var onItemClick: ((Student) -> Unit)? = null

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): StudentViewHolder {
        val binding = ItemStudentBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return StudentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    fun setOnItemClickListener(listener: (Student) -> Unit) {
        onItemClick = listener
    }

    inner class StudentViewHolder(
        private val binding: ItemStudentBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(student: Student) {
            binding.tvStudentName.text = student.fullName
            binding.tvAdmission.text = student.admissionNumber
            binding.tvAvatar.text = student.fullName
                .firstOrNull()?.uppercaseChar()?.toString() ?: "S"

            // Recolor the pill drawable in place (instead of
            // setBackgroundColor, which would replace it with a plain
            // rectangle and lose the rounded badge shape).
            val context = binding.root.context
            val pill = binding.tvStatus.background.mutate() as GradientDrawable
            if (student.isActive) {
                binding.tvStatus.text = "Active"
                binding.tvStatus.setTextColor(
                    ContextCompat.getColor(context, R.color.success)
                )
                pill.setColor(
                    ContextCompat.getColor(context, R.color.success_light)
                )
            } else {
                binding.tvStatus.text = "Inactive"
                binding.tvStatus.setTextColor(
                    ContextCompat.getColor(context, R.color.danger)
                )
                pill.setColor(
                    ContextCompat.getColor(context, R.color.danger_light)
                )
            }
            binding.root.setOnClickListener {
                onItemClick?.invoke(student)
            }
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<Student>() {
        override fun areItemsTheSame(
            oldItem: Student, newItem: Student
        ) = oldItem.studentId == newItem.studentId

        override fun areContentsTheSame(
            oldItem: Student, newItem: Student
        ) = oldItem == newItem
    }
}